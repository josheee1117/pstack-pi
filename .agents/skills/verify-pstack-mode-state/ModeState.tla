---- MODULE ModeState ----
\* One session of extensions/pstack.js: mode flag, plan widget, and the
\* "still shows step" reminder. One step here is one step there.
\*
\* Code:
\*   extensions/pstack.js:107-108  NUDGE_EVERY = 6, NUDGE_LIMIT = 2
\*   extensions/pstack.js:248-262  modeOn, plan, sincePlan, nudges, noPlan, finishedPlan, resetNudges
\*   extensions/pstack.js:323-324  pstack_plan execute stores the reported plan and resetNudges()
\*   extensions/pstack.js:340-363  restoreState replays the branch, then drops a finished plan
\*   extensions/pstack.js:419-424  planNudge
\*   extensions/pstack.js:437-438  agent_settled drops a finished plan
\*   extensions/pstack.js:468-471  /pstack off clears mode, appends {enabled: FALSE}, clears the plan

EXTENDS Integers, Sequences, TLC

VARIABLES
  modeOn, planOpen, planDone,
  sincePlan, nudges,
  branch, restored

vars == <<modeOn, planOpen, planDone, sincePlan, nudges, branch, restored>>

NudgeEvery == 6
NudgeLimit == 2

NoPlan ==
  /\ planOpen' = FALSE
  /\ planDone' = FALSE
  /\ sincePlan' = 0
  /\ nudges' = 0

\* extensions/pstack.js:323-324
ReportPlan(open) ==
  /\ planOpen' = open
  /\ planDone' = ~open
  /\ sincePlan' = 0
  /\ nudges' = 0

\* extensions/pstack.js:340-363. Branch order is oldest first, so the last
\* matching entry wins. A plan entry and an off entry in one record are not
\* one step in the code: the loop handles them as two entries.
Restore ==
  /\ LET replay[i \in 0..Len(branch)] ==
       IF i = 0 THEN [mode |-> FALSE, open |-> FALSE, done |-> FALSE]
       ELSE LET prev == replay[i - 1]
                entry == branch[i]
            IN IF entry = "plan_open" THEN [mode |-> prev.mode, open |-> TRUE, done |-> FALSE]
               ELSE IF entry = "plan_done" THEN [mode |-> prev.mode, open |-> FALSE, done |-> TRUE]
               ELSE IF entry = "mode_on" THEN [mode |-> TRUE, open |-> prev.open, done |-> prev.done]
               ELSE [mode |-> FALSE, open |-> FALSE, done |-> FALSE] \* "mode_off"
     IN LET ended == replay[Len(branch)]
            finished == ended.done
        IN /\ modeOn' = ended.mode
           /\ planOpen' = ended.open /\ ~finished
           /\ planDone' = FALSE
           /\ sincePlan' = 0
           /\ nudges' = 0

\* extensions/pstack.js:419-424. pstack_plan's own result returns before this.
\* Once the plan is abandoned the code returns before counting (line 422),
\* so further tool results are not new states.
OtherTool ==
  /\ IF planOpen /\ nudges < NudgeLimit
     THEN /\ IF sincePlan + 1 >= NudgeEvery
             THEN /\ sincePlan' = 0
                  /\ nudges' = nudges + 1
             ELSE /\ UNCHANGED nudges
                  /\ sincePlan' = sincePlan + 1
     ELSE UNCHANGED <<sincePlan, nudges>>
  /\ UNCHANGED <<modeOn, planOpen, planDone, branch, restored>>

Init ==
  /\ modeOn = FALSE
  /\ planOpen = FALSE
  /\ planDone = FALSE
  /\ sincePlan = 0
  /\ nudges = 0
  /\ branch = <<>>
  /\ restored = TRUE

TurnOn ==
  /\ ~modeOn
  /\ modeOn' = TRUE
  /\ branch' = Append(branch, "mode_on")
  /\ restored' = FALSE
  /\ UNCHANGED <<planOpen, planDone, sincePlan, nudges>>

\* /pstack <task> and /skill:pstack also turn the mode on (lines 381-384 and
\* 484-485). Same flag write, so TurnOn covers them.

TurnOff ==
  /\ modeOn' = FALSE
  /\ branch' = Append(branch, "mode_off")
  /\ restored' = FALSE
  /\ NoPlan

\* The model may report a plan while the mode is off. The tool does not check
\* modeOn (lines 323-324), and a resume keeps that plan when no later off exists
\* (tests/extension.test.js "a plan reported after turning off still shows").
ReportOpen ==
  /\ ReportPlan(TRUE)
  /\ branch' = Append(branch, "plan_open")
  /\ restored' = FALSE
  /\ UNCHANGED modeOn

ReportDone ==
  /\ planOpen
  /\ ReportPlan(FALSE)
  /\ branch' = Append(branch, "plan_done")
  /\ restored' = FALSE
  /\ UNCHANGED modeOn

Settle ==
  /\ IF planDone THEN NoPlan ELSE UNCHANGED <<planOpen, planDone, sincePlan, nudges>>
  /\ UNCHANGED <<modeOn, branch, restored>>

\* session_start and session_tree share restoreState (lines 368-369).
SwitchBranch ==
  /\ Restore
  /\ restored' = TRUE
  /\ UNCHANGED branch

\* Six entries is enough to order off, a later plan, a finished plan, and a
\* resume. A longer branch replays the same four entry kinds.
BranchBound == Len(branch) <= 6

Next ==
  \/ /\ BranchBound
     /\ \/ TurnOn
        \/ TurnOff
        \/ ReportOpen
        \/ ReportDone
  \/ OtherTool
  \/ Settle
  \/ SwitchBranch

Spec == Init /\ [][Next]_vars

\* A mode entry only changes the flag (line 354). Off is the entry that clears
\* the plan (lines 355 and 471). Turning the mode back on must not bring a
\* plan back. A plan the model reports after that on is a new report.
OffClearsPlan ==
  LET prior[i \in 0..Len(branch)] ==
        IF i = 0 THEN FALSE
        ELSE IF branch[i] = "mode_off" THEN TRUE
        ELSE IF branch[i] = "plan_open" THEN FALSE
        ELSE prior[i - 1]
  IN ~modeOn \/ ~planOpen \/ ~prior[Len(branch)]

\* A finished plan stays through the reply (line 435) and is gone after the
\* next settle or restore. While it is still on screen it has no open step,
\* so it draws no reminder (line 422).
DonePlanIsQuiet == ~planDone \/ (nudges = 0 /\ sincePlan = 0 /\ ~planOpen)

\* Two ignored reminders end it (NUDGE_LIMIT), until the model reports again.
\* Reporting is the only writer that resets nudges while a plan stays open.
AbandonedStops == nudges <= NudgeLimit

\* After a resume, the widget is whatever this branch replays to. Entries
\* written since that resume are not in the branch yet, so the check waits.
BranchAgrees ==
  LET replay[i \in 0..Len(branch)] ==
        IF i = 0 THEN [mode |-> FALSE, open |-> FALSE, done |-> FALSE]
        ELSE LET prev == replay[i - 1]
                 entry == branch[i]
             IN IF entry = "plan_open" THEN [mode |-> prev.mode, open |-> TRUE, done |-> FALSE]
                ELSE IF entry = "plan_done" THEN [mode |-> prev.mode, open |-> FALSE, done |-> TRUE]
                ELSE IF entry = "mode_on" THEN [mode |-> TRUE, open |-> prev.open, done |-> prev.done]
                ELSE [mode |-> FALSE, open |-> FALSE, done |-> FALSE]
      ended == replay[Len(branch)]
      finished == ended.done
  IN \/ ~restored
     \/ /\ modeOn = ended.mode
        /\ planOpen = (ended.open /\ ~finished)
        /\ planDone = FALSE

====
