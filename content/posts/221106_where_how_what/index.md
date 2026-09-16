---
title: Where before How and What
url: /posts/where_how_what/
date: 2022-11-06
company: Personal update
---

It has been another interesting week. I finished writing two manuscripts and their revisions, so the waiting period begins. And I was not in the mood to train models for a surgery project so decision to overhaul the webpage was made. I know, [the last one](/posts/learning_html#head) served the purpose. It showed a summary of me, my Curriculum vitae (CV) and occasional posts, so what more can I ask? Well, I did have some issues in mind. <!--more-->

## What do I need

First, I would like the tabs to be in one combined page, instead of having to go in specific tabs. Then, I would like the pages to be responsive to specific browsing resolutions. Since the layout used tabs, they became like the classic story of butt-dialing albeit with the fingers.

So, I dived back to Jekyll templates. My needs always have been simple, it is an online CV, a redundant _LinkedIn_ if you may. The search was not long, I settled on one clean variation of it. It was made originally by **Xiaoying Riley** at [3rd Wave Media](http://themes.3rdwavemedia.com/) _<[@3rdwave_themes](https://twitter.com/3rdwave_themes)>_, then [forked](https://github.com/sharu725/online-cv) for Jekyll use by **Sharath Kumar** at [Webjeda](https://webjeda.com) _<[@webjeda](https://twitter.com/webjeda)>_. So, Kudos to both.

The move was simple. Sharath has a straight forward approach of consolidating data in one long `YAML` file. Interestingly, `YAML` stands for both _Yet Another Markup Language_ and _YAML Ain't Markup Language_ at the same time. Different HTML files call the specific keys in the data documents. At the end, the HTML files are stacked for specific page, although current template only has one.

It achieves my purposes. I now have one combined page. The contact information, education and interests are put in a _sidebar_ which is put right next to the main container with the summary and such by applying a `css grid`. A beautiful approach, which I would repurpose soon enough. It also is mobile responsive by stacking the two containers top to bottom as the `media` decreases less than the `min-width`.

However, I lost the _Posts_ page, which is a shame. I no longer use facebook or twitter anymore, so as a millennial, the urge to overly share private and embarassing details need to be satisfied. Then, I need to redirect to a second page instead of cluttering all up the clean page two beautiful people has fabricated already.

## The Hack

Again, I need to remind everyone that I have never learnt `HTML` or applied it professionally before. So, my skills are largely limited on a [B-graded assignment project](https://github.com/finerbrighterlighter/AQ10_questionnaire) and of course, the previous webpage. And as a proud [Burmese](https://www.youtube.com/watch?v=o-i89wHCPlE) that I am, what I have to do has never been clearer; it is "`le Code des spaghettis`".

The post entries will still largely follow the previous version, Markdown files with `YAML` headers to be called when necessary. Images are added in a `css-grid` container with image tags so that we can avoid scrolling forever, _not that I would add that much photos_. The markdown entries will be read by a file that rearranges `YAML` attributes and content.

Headers are given `id` so that the mobile users will not have to scroll down the _sidebar_ block again and again each page. The grid was given a `minmax(400px, 1fr)` attribute so that the new columns will be added as long as the images can maintain a legible 400 pixels width. The page would have footers to go back to home page. All post entries will be shown in the [Posts](/posts#head) page.

The post pages would call all entries and list them down in uniform format. So, I adapted [this repo](https://github.com/michaelx/jekyll-photos) by Michael Xander <[@michaxndr](https://twitter.com/michaxndr)> that creates a bootstrapped gallery page by calling all markdown entries with a specific layout. As advertised, it is **dead simple** approach that fits in the `default` layout.

## Problem

Here, I met the problem of `sort`. See, GitHub sorts all files and folders in repositories by name, and the loop calls from the first index. It means the Posts page would start by the post preceding with A or `zero` rather than the newest post.

Then I thought about giving date based prefixes, as in `YYMMDD_foo.md` for entries on 6th of November 2022 _(neither MMDDYY nor YYDDMM because I am not a lunatic)_. Then the first index becomes the oldest entry, since `221006` is earlier than `221106` in alphabetic order.

I even thought about naming the newest entry as `1_foo.md`, `2_bar.md` and so on, just to force the order. Then I will have to rename all entries every time I have a new post. That's not the optimal approach; the answer is simple. Let the filter get all entries as normal and then loop from the last index, i.e., reverse it.

## Why I couldn't fix

I started reading how to do so in `HTML`, of course, it is not a programming language. So, the common approach is using a script tag for `javascript`. Apparently it is:

`for (var i = arr.length - 1; i >= 0; i--)`

in JS. However, my knowledge in JS stops at writing `public static void main`. But Michael's approach does not use JS loop, instead his syntax uses:

`{% for i in arr %}{% endfor %}`

The loop looks pythonic, but I was confused what language even is that. On google search, it seems people do envelope `Django` within HTML blocks using `{{ foo }}` or `{% bar %}`. I felt real smart back then btw, it makes sense right. A python-based language that uses `{% %}`, it **HAS** to be Django. I went to read the docs and the reverse seems simple enough. It is:

`{% for i in arr reversed %}{% endfor %}`

That's all apparently.

And as you can read from the section title, it did not work.

## How to fix

Turns out, I was looking at the wrong language. The code was using `liquid` language within Jekyll itself, and the fix also was simple enough. It was:

`{% assign arr = site.pages | where: condition | sort: value | reverse %}`

It is just filter, sort and reverse the list. Simple af.

I was humbled. I added the _Posts_ page, named entries in `YYMMDD_foo.md` format, called them, sorted them by name and then reversed the list order. Of course, now it works like magic, `221106_foo.md` is shown before `221006_bar.md`. Now that I know what language I am working on, I even added an _Updates_ section on the home page. It shows the newest entry, i.e. first entry in the filtered list, then gives the link to the _Posts_ page. The entries would be in similar `css-grid` to the images.

See, in my 4-years career as a data scientist, my motto always has been **"Know what to do it before how to do"**. My work does not limit me within Machine Learning or Deep Learning, at times, I am required to work with Statistical Models as well. The environments I work with spans from Python and R to STATA and SPSS, even Excel at times. So, I decided that I would rather learn what models, what analysis, what processes I have to do for this project than learning all languages, programs and packages existing.

Turns out it is knowing **where you are** even before knowing what to do, before knowing how to do.