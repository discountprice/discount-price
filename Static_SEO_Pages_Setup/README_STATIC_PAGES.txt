DISCOUNT PRICE - STATIC SEO PAGES SETUP

Is zip mein:
- index.html                                  (naya, links ab /stores/slug/ aur /blog/slug/ par jate hain)
- scripts/generate-seo-pages.mjs              (pages banane wala script)
- .github/workflows/generate-seo-pages.yml    (GitHub Actions: script khud chalata hai)

GITHUB PAR UPLOAD (folder structure bilkul isi tarah hona chahiye)
1. index.html  -> repository root mein replace karein.
2. scripts/generate-seo-pages.mjs -> Add file > Create new file, naam mein likhein: scripts/generate-seo-pages.mjs, phir file ka content paste karein.
3. .github/workflows/generate-seo-pages.yml -> Add file > Create new file, naam mein likhein: .github/workflows/generate-seo-pages.yml, phir content paste karein.

PEHLI BAAR CHALANA
- Repository > Settings > Actions > General > Workflow permissions > "Read and write permissions" select karke Save.
- Actions tab > "Generate SEO pages" > Run workflow.
- Green tick ke baad repo mein stores/, blog/, sitemap.xml, robots.txt aa jayenge.

GOOGLE SEARCH CONSOLE
- URL-prefix property: https://discountprice.github.io/discount-price/
- Sitemaps mein submit karein: sitemap.xml

NOTE: naya blog/store publish karne ke baad pages 6 ghante mein khud ban jate hain,
ya foran chahiye to Actions tab se Run workflow karein.
