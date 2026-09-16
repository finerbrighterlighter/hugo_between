---
title: Thailand Health AI Conference & Datathon 2023
date: 2023-10-03
url: /posts/thahai_datathon/
company: Khon Kaen University, Thailand
---


With the support of the Faculty of Medicine Ramathibodi Hospital and Khon Kaen University, I had the privilege of participating in the [Thailand Health AI Conference and Datathon 2023](https://web.archive.org/web/20231006064810/https://datathonthailand.org/), held from October 3rd to 6th. My involvement in curating one of the event's cohorts earned me an invitation to share my experiences and provide guidance as a mentor. <!--more-->

{{< gallery match="{THAI_datathon-1.webp,THAI_datathon-2.webp}" >}}

Until this opportunity, I had never ventured into the role of an instructor, since it had never been a personal aspiration of mine. On numerous occasions, I had expressed my preference for being a collaborative team member, contributing my expertise, rather than assuming the role of an advisor guiding someone else's research career. Becoming a mentor has proven to be an intriguing journey. 

{{< gallery match="{ceb-2.webp}" >}}

## Health AI Datathon

The "Health AI Datathon," a short term for "Data Hackathon”, is an innovative initiative established by MIT Critical Data, a consortium comprising multiple research groups within the Massachusetts Institute of Technology. Among the consortium's most notable endeavors is the MIMIC data project (Medical Information Mart for Intensive Care), which involves the extraction of real-world data from the ICU division of Beth Israel Deaconess Medical Center.

While Randomized Control Trials are widely regarded as the gold standard for generating unfiltered evidence in medical research, they are not without their limitations, particularly in terms of resource constraints and external applicability. These trials are meticulously designed with stringent inclusion and exclusion criteria to isolate the effects of a treatment, which, unfortunately, does not accurately mirror the complexities of the real world, where populations are diverse, and treatment strategies and their effectiveness vary considerably. Consequently, real-world data studies offer us the opportunity to observe what actually occurs in clinical practice.

{{< gallery match="{mentors-3.webp}" >}}

Dr. Leo Anthony Celli, while working with real-world data, made a striking observation—most health studies are conducted in affluent countries, with a staggering 50% of real-world data studies relying on data from the United States or China. The findings derived from these studies are subsequently translated into treatment guidelines that are applied universally, affecting populations worldwide. Dr. Celli believes that this practice significantly contributes to the suboptimal outcomes observed in the treatment of various diseases in regions such as Africa, Asia, and Latin America. In response to this glaring disparity, the MIT Critical Data team recognized that data from a single hospital or a single country fails to capture the true diversity of the real world. They firmly believe that those who are disproportionately burdened by diseases should be at the forefront of shaping the research agenda to address these critical issues.

Since 2014, MIT Critical Data has embarked on a global journey, hosting datathons in various locations around the world. As of October 2023, these datathons have been conducted in more than 20 different countries, and the Thailand Health AI Datathon marked a significant milestone as the fiftieth event in this remarkable endeavor.

{{< gallery match="{mentors-1.webp}" >}}

## The Mixture 
In the Thailand Health AI Datathon of 2023, the organizers embraced a novel approach by intentionally assembling participants from a multitude of backgrounds and affiliations into mixed teams. This eclectic mix included medical practitioners from various specialties, computer scientists, and engineers hailing from diverse fields, each representing distinct stages of their professional journeys. The outcome was a collection of competing teams, each characterized by a unique blend of expertise levels, ranging from enthusiastic beginners to early-stage researchers and seasoned experts in their respective domains.

{{< gallery match="{mentors-4.webp}" >}}

Dr. Celli, one of the driving forces behind this visionary approach, shared his reasoning by recounting an insightful story. He likened the situation to a basketball match in which a group of basketball players attempted unsuccessfully to untangle a net through high jumps. However, a pivotal transformation occurred when a group of cheerleaders decided to form a pyramid formation to resolve the issue. This narrative underscored the fundamental values of collaboration superseding competition, highlighting the notion that solutions can emerge not only from individuals possessing identical expertise but from diverse sources and in various forms.


## Jack of all trades

The composition of the teams in the Thailand Health AI Datathon proved to be an intriguing and eye-opening aspect of the event. Among the participants, there were clinicians who possessed a clear understanding of their medical objectives but lacked the know-how to effectively manipulate and analyze data to achieve these goals. Conversely, there were data specialists who, while proficient in data manipulation, were less familiar with the intricacies of proper study designs for medical research. This dynamic was not limited to the participants alone; it extended to the mentors as well. The mentors, hailing from diverse backgrounds mirroring the participants, brought forth unique perspectives on data science tailored to their respective fields of research.

{{< gallery match="{Team_HT-3.webp}" >}}

In this diverse landscape, I found myself in a unique position. My academic journey had taken me through dentistry as my undergraduate focus, followed by a deep dive into data science for my postgraduate research. While I may not claim to be the foremost expert in either discipline, this amalgamation of backgrounds enabled me to perceive the challenges faced by individuals from different training backgrounds and to facilitate effective communication between them. This experience fostered within me a profound appreciation for my distinctive position, standing at the crossroads of this interdisciplinary field.

## Real World Data

I found myself captivated by the intricate world of real-world data and informatics. At my work, I am tasked with extracting electronic medical records to create research-ready datasets, a role I fondly refer to as that of a "data janitor." The culmination of my efforts, spanning months at times, typically results in a single paragraph in the final research manuscript—a brief mention of inclusion and exclusion criteria and the resulting sample size. In the realm of epidemiological research, much of the focus tends to gravitate towards the analysis, effect sizes, and modeling. However, my interactions with the MIT Critical Data team have indelibly altered my perspective.

{{< gallery match="{mentors-2.webp}" >}}

I have come to appreciate the immense importance of meticulous data preprocessing. While in general data science, complete case analyses are permissible as long as the sample size remains adequate, the landscape is markedly different in medical research. Each exclusion of a group of patients introduces the potential for selection bias. A quote by Dr. Celli resonates deeply with me, "Be aware of the subjects who are not in your data because de-biasing cannot be done via fine-tuning the model." In essence, while "Table 1" is a ubiquitous fixture in medical studies, it is equally imperative to shed light on those individuals who did not make it to the table. Questions pertaining to the criteria that led to their exclusion and the fairness of these criteria should be addressed.

The mentors of the Datathon consistently emphasized the need to exercise caution before diving into modeling and the critical importance of establishing a robust rationale for the necessity of a model. One memorable example they shared was that of a hypothetical Alzheimer's predictor boasting 100% accuracy. They posed a thought-provoking question: "What good of knowing it in advance if you cannot do anything but panic?”.

{{< gallery match="{Team_HT.webp}" >}}

## Mentorship

In the realm of mentorship, Dr. Michael G. Morley emerged as a beacon of inspiration for me. With a lifelong career as a clinician and ophthalmologist, Dr. Morley embarked on a recent journey into the realm of real-world data research. I had the privilege of shadowing him as a local mentor for his team, and I was profoundly impressed by his open-minded approach, despite his extensive experience in medical practice and research. Dr. Morley readily acknowledged that real-world data research is a rapidly evolving field, and he remained humble about the extent of his knowledge. Consequently, he was not only willing but eager to listen to the diverse ideas and perspectives that his team brought to the table.

{{< gallery match="{mentors-5.webp}" >}}

Dr. Morley's team consisted entirely of enthusiastic but early-stage researchers, which initially presented a notable lack of direction on the first day of the Datathon. However, Dr. Morley swiftly stepped in to discern the team's objectives and establish a framework that allowed them to develop the information necessary to fulfill those objectives. He wholeheartedly valued the incremental progress his team made, no matter how modest it might have seemed. Driven by his powerful positive reinforcement, his team, including myself, found ourselves motivated to achieve our best.

At the culmination of the Datathon, Dr. Morley's guidance and leadership bore fruit as his team secured the second runner-up position. This experience of mentoring a group of undergraduate computer engineers, coupled with Dr. Morley's profound influence, left me contemplating unexplored desires within myself. It sparked a question about whether I had uncovered a latent aspiration to become a lecturer, further fueling my commitment to the path of mentorship and education.

{{< gallery match="{Team_HT-4.webp}" >}}

## Health Data Science

Throughout the Thailand Health AI Datathon, I made it a point to express my deep appreciation to all the teams for the remarkable work that they had accomplished within the span of just 48 hours. In my own experience, research projects of this magnitude typically span months, if not years, and involve numerous interdisciplinary meetings. Witnessing the maturity of the research questions that several teams had developed over such a short time was a delightful surprise.

My hope is that every participant derived as much enjoyment and fulfillment from this experience as I did while watching them work tirelessly. My wish is that this Datathon served not to intimidate or discourage participants from the realm of health data science but, rather, to kindle a passionate flame within them for real-world data and secondary data research.

{{< gallery match="{Team_HT-2.webp,cert_datathon.webp}" >}}

See the recap of the event [here](https://www.youtube.com/watch?v=wCVkSGJEu30) (*in Thai*).

{{< youtube wCVkSGJEu30 >}}