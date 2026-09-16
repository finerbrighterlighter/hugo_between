---
title: "The Duck, the Data, and the Sceptic: Eight Years of Learning to Ask Better Questions"
date: 2026-05-06
url: "/posts/260506-growth-as-a-researcher/"
company: "Personal update"
math: true
---

In my second year of my MSc, I hosted my first journal club. The paper was on [Mixed Effect Machine Learning](/posts/msc_journal_club/), a framework for handling the **correlated observations** that show up constantly in clinical data, where the same patient appears in your dataset dozens of times. 
<!--more-->

I was genuinely excited. The core idea was elegant: decompose the outcome into a **population-level signal** and a **subject-specific noise term**, train your ML model on the clean signal, and you get better predictions on **clustered data**.

My excitement was entirely about the mechanics. I remember being absorbed by the **EM algorithm's** convergence logic: the way it iteratively partitioned variance until the **fixed and random effects** stabilized. I presented it the way I understood it: as a solution to a technical problem. The **random effects** were a nuisance to be mathematically isolated. The win condition was a better **AUROC**.

I hadn't yet thought to ask what information was just left on the table.

---

Before the MSc, I was a [dental house officer](/posts/I_was_a_dentist/#house-officer) in Yangon. Our team spent days in the field measuring **periodontal pocket depths** — six sites per tooth, twenty-eight teeth per patient — and we were still short of our target sample size. We knew, without being able to articulate it precisely, that a smarter way to prioritize candidates existed. We just didn't have the tools.

That frustration is what sent me to Mahidol. I arrived wanting tools. For the first two years, tools were all I wanted.

---

Last month, I hosted another journal club, this time later in my academic journey, on a paper titled [Assessing the Replicability of RCTs in RWE Emulations](/posts/phd_journal_club/). The paper comes out of the **RCT DUPLICATE initiative**, which has spent years trying to replicate randomized trial findings using **routine healthcare claims data**. The central question isn't "can we model this?" It's "should anyone believe what the model is telling them?"

The paper's proposed framework of the **Sceptical P-Value** approaches replication the way a rational skeptic would. You start by quantifying the **maximum disbelief** the original RCT result can survive, given its own **uncertainty**. Then you ask whether the **real-world evidence** conflicts strongly enough with that disbelief to reject it. It's not two separate significance tests; it's a **joint credibility assessment**. The win condition is *epistemic, not predictive*.

What struck me preparing this presentation was how different my instincts were compared to 2021. I wasn't excited about the math first. I was thinking about the **TRITON-TIMI 38 emulation** in the case study which is a trial of *prasugrel versus clopidogrel* and about who the evidence was quietly built for. The formal exclusion list was short: *intracranial pathology, anemia, thrombocytopenia, pregnancy*. But the enrolled population tells the real story. 92.5% Caucasian. A third from North America. Virtually everyone with immediate access to a catheterization lab. In a fragmented healthcare environment like the one I came from, that profile isn't the majority — it's the exception.

---

The **variance** I once called a *nuisance*, I now call **uncertainty**. The patients I once called *exclusions*, I now call **selection bias**. These aren't just terminological upgrades. They reflect a different relationship to the question.

In 2021, I was asking: *how do I fit this correctly?*

In 2026, I'm asking: *is this evidence trustworthy enough to act on — and for whom?*

The Yangon fieldwork and the sceptical p-value are, at some level, the same problem at different scales. A measurement you couldn't take because the patient never came back, and a treatment effect you can't trust because the trial never enrolled people like them, both are *absences* that distort the evidence. Learning to see those *absences*, rather than just optimizing around them, is the work I didn't know I was signing up for.

In the intersection of clinical logic and data science, there is a specific kind of in-between existence. The duck belongs to both the water and the sky, and the land between them. Eight years in, I think the most important thing that land has taught me is this: **the data tells you what it saw. Your job is to remember everything it didn't.**
