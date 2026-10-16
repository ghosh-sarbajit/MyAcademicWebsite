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
| Site name, SEO, theme | `config/_default/params.yaml` |
| Navigation menu | `config/_default/menus.yaml` |

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
