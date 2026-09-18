# Eval

**You own the experiment design. Plan, blind, run, synthesize.**

## Blinding, non-negotiable

- No `eval`, `test`, `judge`, `experiment`, `rubric`, `score`, `compare`, `benchmark`, `candidate`, or `arena` in any directory, file, or prompt the candidate sees.
- The candidate prompt looks like an organic user request. State the goal, not the meta.
- No chain-eliciting cues. Do not ask the candidate to list which skills, principles, or files it applied. Ask for design notes generally, and grade chain-following from the code shape, not self-report.
- Sanitize directory and file names. Use project-shaped names a user might pick.
- Do not tell a candidate that other candidates exist.
- The judge may know it is judging. It sees outputs by sanitized label only, never by model name.
- To compare two variants, one judge scores both sets in a single pass on one scale, blind to which set each came from.

## Steps

1. **Frame.** State the variant under test and what behavior counts as success. Write the rubric, three to six concrete criteria, for the judge only. Hold it back from the candidates.
2. **Set up sanitized environments.** One working directory per candidate with the variant in place. Plant the context an organic task would have: a project skeleton, the skills the candidate would naturally read.
3. **Author one organic prompt.** What a user would type. No leakage of what is being measured.
4. **Run N candidates** on different models per `pstack-arena` phase B, each in its own sanitized directory, with the same prompt. Read [`../references/execution.md`](../references/execution.md) first: the candidates and the judge each need their own fresh context. A single model is fine for every candidate, because independence comes from the fresh context and the blind read, not from the model name. If the environment cannot run sessions in parallel, run them sequentially, still one fresh context each, and say so in the report.
5. **Run one blinded judge** on a different model family from every candidate, per `pstack-arena` phase C. The judge sees outputs by sanitized label plus the rubric, never a model name.
6. **Verify the chain from records, not self-report.** Read each candidate's own session record and look at which files it actually opened. Under Pi, a candidate session's record is its `PI_SESSION_FILE`. Read only records belonging to this eval, under this working directory. Do not read unrelated projects' private sessions. Grade chain-following from the files really read plus the shape of the code, never from the candidate's claims.
7. **Read every candidate output yourself, end to end.** Compare against the judge's verdict. Disagreement means a model is biased or the rubric is ambiguous. Synthesize.

**Reply.** Variant under test, rubric, per-candidate notes, the judge's verdict, your synthesis, and whether to promote the variant.
