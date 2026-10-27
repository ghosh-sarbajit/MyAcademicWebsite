# Sarbajit Ghosh — Academic Website

Source for my personal academic website, **<https://ghosh-sarbajit.github.io/>**.

The site is built with [Hugo](https://gohugo.io/) and the [HugoBlox](https://hugoblox.com/) Academic CV template.
It is published from the [ghosh-sarbajit/ghosh-sarbajit.github.io](https://github.com/ghosh-sarbajit/ghosh-sarbajit.github.io)
repository, which holds this same source: on every push to `main`, the *Deploy website to GitHub Pages*
workflow builds the site and publishes it.

## Where things live

| What | File |
| --- | --- |
| Profile, bio, education, experience, skills, awards | `data/authors/me.yaml` |
| Profile photo | `assets/media/authors/me.jpg` |
| CV (linked from "Download CV") | `static/uploads/resume.pdf` |
| Homepage sections | `content/_index.md` |
| Experience page | `content/experience.md` |
| Publications | `content/publications/<paper>/index.md` + `cite.bib` |
| Writing (essays) | `content/writing/<post>/index.md` |
| Writing page design | `layouts/writing/`, `static/writing/style.css` |
| Apps (Literature Finder, Citation Download) | `content/apps/`, `layouts/apps/`, `layouts/_partials/apps/`, `static/apps/` |
| Site name, SEO, theme | `config/_default/params.yaml` |
| Navigation menu | `config/_default/menus.yaml` |

## Apps

The **Apps** menu holds two tools that run entirely in the visitor's browser; they are JavaScript versions of
`scrape.py` and `citationDownload.py` from [MyBibliography](https://github.com/ghosh-sarbajit/MyBibliography):

- **Literature Finder** (`static/apps/literature-finder.js`) searches arXiv for recent papers on the topics in `TOPICS`
  (kept in step with `scrape.py`), ranks them by keyword hits, and shows them with filters, expandable abstracts, links
  (arXiv page, PDF, HTML) and downloads (CSV with or without abstracts, titles, JSON). It also opens the
  `SearchReport.json` / `SearchReport_*.csv` files that `scrape.py` writes.
- **Citation Download** (`static/apps/citation-download.js`) turns titles into BibTeX in the bibliography's style
  (DBLP, OpenReview, Crossref, Semantic Scholar, arXiv, OpenAlex, PMLR, NeurIPS; not Google Scholar) and downloads the
  new entries per topic file. "Get BibTeX" in the Literature Finder hands the selected titles over.

Visitors can load their `.bib` files so known papers are skipped; only titles and keys are kept, in their browser.
Services that do not allow cross-site requests are reached through public CORS proxies, or a proxy set under *Settings*.

## Preview locally

Requires Hugo extended (version in `hugoblox.yaml`), Go, Node.js and pnpm.

```bash
pnpm install
pnpm dev                         # preview at http://localhost:1313
```

## Deploy

Push `main` to the GitHub Pages repository (add it once as a remote):

```bash
git remote add github-io git@github.com:ghosh-sarbajit/ghosh-sarbajit.github.io.git
git push origin main && git push github-io main
```

## License

The template code is MIT-licensed (see `LICENSE.md`). The site content is © Sarbajit Ghosh.
