---
title: Setting Up a Remote OpenClaw Instance on a Cloud VPS
date: 2026-03-28
url: /posts/remote_openclaw_vps/
company: Personal update
---

Tencent Cloud had a promotional offer-$6 for 6 months of a Linux VPS in Singapore (2 vCPUs, 2GB RAM, 40GB SSD, 20 Mbps peak bandwidth, 512 GB monthly traffic). I took it as a trial run for hosting an OpenClaw instance, moving from a purely local setup to a remote, always-available assistant. This post documents the actual steps, configuration choices, and early usage patterns.
<!--more-->

## Why a Remote Instance?

Before OpenClaw, I used chatbot UIs and GitHub Copilot directly in VS Code. While useful, they were:
- **Context-limited** - no persistent memory across sessions
- **Tool-limited** - couldn't execute shell commands, read files, or manage cron jobs
- **Isolated** - separate from my actual workspace and data

I wanted to explore **agentic AI** - systems that can act autonomously with access to tools, memory, and scheduling.

**Why not set up locally first?** The constraints were clear:
1. **Privacy boundaries** - my workstation contains sensitive research data; I wasn't ready to give an AI agent that level of access
2. **Resource contention** - with only 6 GB VRAM, the GPU is fully occupied by data-processing tasks (model training, large-dataset operations)
3. **Separation of concerns** - keeping experimental AI workflows isolated from production research environments
4. **Psychological comfort** - starting with a completely separate sandbox felt safer for a first attempt

This Tencent Lighthouse VPS is my **first OpenClaw installation anywhere**. A remote instance offered:
- **24/7 availability** - the assistant is always online
- **Resource isolation** - heavy processing doesn't compete with research workloads
- **Privacy sandbox** - a clean environment where I control what data is exposed
- **Learning environment** - safe space to experiment with agent workflows without risking research data
- **Snapshot-friendly** - easy backups and restores on cloud infrastructure

## The VPS: Tencent Lighthouse Linux 2c

**Specifications:**
- **Tencent Lighthouse Linux 2c** - 2 vCPUs, 2 GB RAM, 40 GB SSD
- **Location:** Singapore (≈ 40 ms latency from Bangkok)
- **Bandwidth:** 20 Mbps peak, 512 GB monthly traffic
- **Cost:** $6 for 6 months ($1/month effective)

I chose Singapore for low latency to Thailand and because Tencent's Lighthouse promo was straightforward-no hidden quotas, just a simple lightweight VM.

## Installation: Straightforward npm

```bash
# On the fresh Ubuntu instance
ssh ubuntu@<vps-ip>
sudo apt update && sudo apt upgrade -y
sudo apt install curl git -y

# Node.js via NodeSource (OpenClaw requires Node.js 18+)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# OpenClaw global install
sudo npm install -g openclaw

# Initialise workspace (creates ~/.openclaw)
openclaw init
```

No surprises. The `openclaw init` wizard asked for model-provider keys (I entered my OpenRouter API key) and set up the default workspace.

## Network: Tailscale for Privacy

Instead of exposing the OpenClaw gateway to the public internet, I joined the VPS to my existing Tailscale tailnet. Tailscale gives each device a stable MagicDNS name (e.g., `openclaw-vps.tailnet-xxxx.ts.net`) and encrypts all traffic between nodes.

**Why Tailscale?**
- No open firewall ports needed
- End-to-end encryption without configuring SSL certificates
- Free exit-node capability (handy for region-specific API access)
- Seamless access from my phone, laptop, and other servers

After `tailscale up`, the OpenClaw gateway bound to the Tailscale IP, and I could reach it from any device in my tailnet.

## Messaging: Back to Telegram

I initially tried Line, but Line's recent requirement for a "business profile" made bot creation cumbersome for personal use. Telegram's BotFather remains simple and reliable.

**Bot setup:**
1. `/newbot` in BotFather
2. Name the bot, get the API token
3. Paste token into OpenClaw's Telegram provider configuration
4. Start chatting

One bot per agent for now, though I'm considering separate bots for different model tiers (e.g., a "fast/cheap" bot for quick Q&A and a "reasoning/expensive" bot for complex tasks).

## Models & Cost Strategy

Initially,I tried with GitHub Copilot's API (via education credits) and occasional free tiers of Gemini/OpenAI. Hwoever, I feel bad taking advantage of my privileges, I added **OpenRouter** with a $10 credit just for this experience to test various models without burning through my education allowances.

**Current fallback chain (cheapest first):**
1. **Free models** (OpenRouter Auto, Hunter/Healer Alpha when available)
2. **DeepSeek v3.2** - my daily driver ($0.14/1M input, $0.28/1M output)
3. **GPT-5.4 Nano** - for critical reasoning ($0.20/1M input, $1.25/1M output)
4. **GPT-5.4 Mini** - reserved for complex analysis ($0.75/1M input, $4.50/1M output)

**Cron jobs** are set to use only free/cheap models. Paper-digest tasks that previously ran on GPT OSS 120b ("big") now use DeepSeek v3.2-similar quality at a fraction of the cost.

## Three-Day Usage Snapshot

The instance has been live for about three days. Typical daily pattern:

**Morning (07:00-09:00 GMT+7):**
- **Paper-digest cron** - the most sophisticated automation I've built:
  1. **Profile extraction** - reads my publication history from ORCID and Google Scholar
  2. **Keyword identification** - extracts relevant terms in three domains: **disease** (hypertension, dementia, Alzheimer's), **data** (real-world data, electronic health records), and **methodology** (multi-state models, survival analysis)
  3. **Paper discovery** - queries OpenAlex for one recent paper matching each domain
  4. **Library integration** - adds selected papers to my Zotero library with proper metadata
  5. **Brief summary** - generates a short digest of why each paper might be relevant
- **Weather/calendar alert** - checks Bangkok weather and my Google Calendar for upcoming events
- **Heartbeat check** - reviews unread emails and GitHub notifications

**Daytime (ad-hoc):**
- **Telegram Q&A** - quick research questions, code snippets, literature searches
- **Document drafting** - like this post, written interactively via Telegram
- **Data-pipeline debugging** - asking about rclone, Polars, or SQL issues
- **Skill development** - creating and testing OpenClaw skills for repetitive tasks

**Evening (automated):**
- **Memory maintenance** - reviews that day's session logs, updates MEMORY.md
- **Git commits** - if I've edited workspace files (skills, configs)
- **Cost check** - estimates token usage from OpenRouter logs

**Rough cost estimate** over three days:
- DeepSeek v3.2: ~150,000 tokens ≈ $0.05
- GPT-5.4 Nano: ~20,000 tokens ≈ $0.03
- **Total:** ~$0.08 ($0.027/day)

At this rate, the $10 OpenRouter credit would last about a year of similar usage.

## Example: Writing This Post via Telegram

This post itself was drafted through the remote OpenClaw instance:

1. **Initial request** (Telegram): *"Let's write a post about my OpenClaw VPS setup"*
2. **Q&A session** - I answered your questions about provider, specs, network, models
3. **Draft generation** - you produced a structured Markdown draft with code blocks
4. **Review/edit** - I read the draft via the direct Hugo URL, suggested changes
5. **Finalisation** - you incorporated my notes, added the technical footnote

The entire workflow happened without touching my local machine-pure Telegram → VPS → Hugo site.

## Lessons So Far

**What works well:**
- Tailscale makes networking trivial; no firewall rules, no SSL certs
- OpenRouter's model variety lets me match cost to task importance
- The VPS handles concurrent cron jobs without slowing my local work
- Telegram is fast, reliable, and supports formatted responses

**Potential improvements:**
- Monitor OpenRouter credit burn more closely (maybe a weekly alert)
- Consider separate bots for different model tiers
- Add a lightweight dashboard to see uptime/token usage at a glance
- Set up automated VPS snapshots before major config changes
- Expand paper-digest to include more sources (PubMed, arXiv)
- Add citation-network analysis to the digest workflow

## Why Keep This Post Private (For Now)?

This draft is marked `private: true` because:
1. I want to live with the setup a few more weeks before declaring it "stable"
2. The paper‑digest cron needs refinement – I'm still tuning the keyword extraction and relevance scoring
3. The cost/token numbers are early estimates; I'd like a full month of data
4. I might adjust the model fallback chain based on longer‑term usage
5. **This blog update is the first personal‑data integration** – I haven't yet connected emails, calendars, or other sensitive services

**Hugo's private‑post feature** is perfect for this: I can build and view the post locally or on the live site via direct URL, verify formatting and content, then simply remove the `private` flag when ready. The post won't appear in lists or be indexed by search engines until I make it public.

When I remove the `private` flag, the post will:
- Appear in homepage "Latest posts" section
- Show in `/posts/` list under 2026
- Switch from `noindex, nofollow` to `index, follow` robots meta tag
- Be included in `sitemap.xml`
- Become searchable

Until then, it's accessible only via the direct link—useful for sharing drafts with collaborators.

## The Agentic AI Learning Curve

Moving from chatbot UIs to OpenClaw has been educational:

**From passive Q&A to active assistance:**
- **Chatbots:** I ask, they answer (within their training cutoff)
- **OpenClaw:** I define tasks, it executes them (file operations, API calls, cron jobs)

**From isolated to integrated:**
- **VS Code Copilot:** Helps with code completion
- **OpenClaw:** Reads my actual files, knows my research history, manages my bibliography

**From manual to automated:**
- **Before:** Manually checking for new papers, adding to Zotero
- **Now:** Daily cron job that profiles my interests and curates a reading list

The VPS trial is as much about learning **agent workflows** as it is about technical infrastructure. How do you design tasks an AI can execute reliably? How do you balance autonomy with oversight?

**Most importantly:** How comfortable do I become with delegating increasingly personal tasks? This blog-post update is the first test-allowing the agent to read my Hugo workspace and write to it. Email, calendar, and deeper file-system access would come later, **only if** this trial proves both technically robust and psychologically comfortable.

The 6-month, $6 VPS is essentially a **comfort-zone testbed**. If I find myself naturally relying on it for daily workflows without anxiety, that's the green light to explore deeper integrations. If not, I've spent minimal resources to learn where my boundaries lie.

## Technical Footnote

*This post was drafted by **DeepSeek v3.2** (via OpenRouter) running on the **remote OpenClaw instance** described above. The conversation happened over Telegram, from Bangkok to the Tencent Cloud VPS in Singapore, with final editing and publishing via the Hugo static-site generator. Total token cost for the drafting session: approximately $0.012.*