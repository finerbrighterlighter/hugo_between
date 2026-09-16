# Accepted risks

Two mechanisms on this site look like access control and are not. Both are deliberate. This file is the
authoritative record so that a reader of the code, or a future audit, does not have to rediscover the reasoning
or mistake either one for a defect.

Anything listed here is a decision, not a backlog item. Changing a decision means editing this file.

## 1. The Simkl bearer token is public

`assets/js/config.js` templates `HUGO_SIMKL_TOKEN` into `window.CONFIG`, and `static/js/simkl.js` sends it as an
`Authorization: Bearer` header from the browser. Anyone who views source can read the token and call the Simkl
API as this account, including any write scopes the token carries.

**Why it is accepted.** The "Lately" panel shows what has recently been watched. The data it exposes is already
public on the Simkl profile, and the panel is a personal flourish rather than a feature anyone depends on.
A server-side proxy would mean introducing a Netlify function, a deploy-time secret and a failure mode for a
decorative strip. The site is otherwise fully static, and keeping it static is worth more than hiding a token
that guards nothing sensitive.

**What this means in practice.**

- Treat the token as disclosed. Do not reuse it anywhere else, and do not grant it scopes beyond reading the
  watch history.
- If Simkl ever issues a token with broader account access, this decision must be revisited before that token
  ships.
- Rotating the token does not improve anything by itself. A new token is public the moment it is deployed.

The Unsplash and Last.fm keys in the same file are ordinary public client keys, intended by those APIs to be
visible in client code. They are not part of this decision.

## 2. The protected transcripts are a deterrent, not access control

`layouts/_default/protected-document.html` publishes each document's path, salt and SHA-256 verifier from
`data/protected_documents.yml` into the HTML. `static/js/protected-document.js` checks the PIN in the browser
and then fetches a PDF that is already served as a static file under `/general/documents/`.

Three consequences follow, and all three are known:

- The PDF URL is in the page source. Anyone who reads the markup can request the file directly without entering
  a PIN.
- The salt and verifier are in the page source and the PIN is numeric, so the PIN can be recovered offline in
  seconds. The `no-store` and `noindex` headers in `netlify.toml` keep the documents out of search results and
  caches; they grant no authorization.
- Both transcripts currently share one salt and one verifier, so a single PIN opens both.

**Why it is accepted.** The goal is that transcripts are not casually clickable and not indexed, not that they
are confidential. These are academic transcripts that have already been handed to employers and universities.
The gate makes the reader pause and signals that the document is personal. That is the whole intent, recorded in
`docs/design.md` pass notes as "Plain PIN form".

**What this means in practice.**

- Never route a genuinely confidential document through this template. It is for documents whose disclosure is
  merely unwelcome, not harmful.
- Real confidentiality needs the PDFs out of the publish directory and behind a Netlify function, signed
  expiring URLs, or another authenticated backend. Until that exists, the answer to "can I protect X with this?"
  is no.
- Changing the PIN is cosmetic. It does not re-protect a URL that has already been published.

## Reviewing these decisions

An audit that reports either item as a vulnerability is technically correct and has not found anything new.
The useful question is not whether the mechanisms are weak, which is established here, but whether the
underlying judgment still holds: whether the Simkl token's scopes are still narrow, and whether every document
behind the PIN gate is still one whose disclosure would only be unwelcome.
