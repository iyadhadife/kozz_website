# Schema audit KozzGo - score 62/100
Injecte via JS (kozz-jsonld). Rendered: home, destinations_ma, faq, devenir-partenaire ont du JSON-LD ; cgv, comment-ca-marche, destinations, impact, kozz-monde, telephones-compatibles: aucun.

## Problemes
- Eleve: URLs https://localhost (OK en local, verifier base prod absolue).
- Eleve: logo.svg - Google n'accepte pas SVG pour le logo (PNG/JPG/WebP >=112x112).
- Moyen: Product sans image, sku, @id ; availability sur AggregateOffer (a mettre sur les Offer) ; pas d'aggregateRating/review (non obligatoires : name + offers suffisent pour Product snippet ; ne pas inventer d'avis).
- Moyen: Organization sans sameAs, contactPoint, description.
- Faible: @context redondant dans BreadcrumbList du @graph ; lowPrice en string (ok).
- Info: FAQPage - rich results FAQ retires pour tous les sites (mai 2026). Aucun gain SERP ; benefice IA non confirme. Garder si cout nul, sinon retirer.
- Absent: SearchAction inutile (sitelinks search box supprime par Google) ; ItemList sur /destinations.

## JSON-LD corrige (fiche pays)
{"@context":"https://schema.org","@graph":[{"@type":"Product","@id":"https://DOMAINE/destinations/ma#product","name":"eSIM Maroc","description":"Forfaits data eSIM pour voyager au Maroc, activation en 1 minute.","image":["https://DOMAINE/img/esim-maroc.jpg"],"sku":"KOZZ-ESIM-MA","brand":{"@type":"Brand","name":"KozzGo"},"offers":{"@type":"AggregateOffer","priceCurrency":"EUR","lowPrice":5.1,"highPrice":26.5,"offerCount":4,"url":"https://DOMAINE/destinations/ma","offers":[{"@type":"Offer","name":"<forfait>","price":5.1,"priceCurrency":"EUR","availability":"https://schema.org/InStock","url":"https://DOMAINE/destinations/ma"}]}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Accueil","item":"https://DOMAINE/"},{"@type":"ListItem","position":2,"name":"Destinations","item":"https://DOMAINE/destinations"},{"@type":"ListItem","position":3,"name":"Maroc"}]}]}

## Accueil : Organization corrigee
{"@type":"Organization","@id":"https://DOMAINE/#org","name":"KozzGo","url":"https://DOMAINE/","logo":{"@type":"ImageObject","url":"https://DOMAINE/logo-512.png"},"description":"eSIM de voyage solidaire","sameAs":["https://www.instagram.com/...","https://www.linkedin.com/company/..."],"contactPoint":{"@type":"ContactPoint","contactType":"customer support","email":"...","availableLanguage":["fr"]}}

## A ajouter
BreadcrumbList sur toutes les pages ; ItemList (ListItem url+name) sur /destinations ; WebPage/AboutPage sur kozz-monde et impact ; Organization avec sameAs (aide entity/IA).

## Bon
@context https, @graph propre, @id relies (publisher), Breadcrumb valide, AggregateOffer avec lowPrice+priceCurrency, FAQ syntaxiquement valide, inLanguage.
