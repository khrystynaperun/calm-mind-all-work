from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicate_ids = set()
        self.fragments = []
        self.gallery_items = 0
        self.gallery_items_without_captions = 0
        self.form_fields = {}
        self.current_form = None
        self.links = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)

        element_id = attributes.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)

        href = attributes.get("href", "")
        if href:
            self.links.append(href)
        if href.startswith("#"):
            self.fragments.append(href[1:])

        if tag == "form":
            self.current_form = attributes.get("id")
            if self.current_form:
                self.form_fields[self.current_form] = []
        elif self.current_form and tag in ("input", "textarea"):
            self.form_fields[self.current_form].append(attributes)

        if attributes.get("data-fancybox") == "coffee-gallery":
            self.gallery_items += 1
            if not attributes.get("data-caption"):
                self.gallery_items_without_captions += 1

    def handle_endtag(self, tag):
        if tag == "form":
            self.current_form = None


html_path = ROOT / "index.html"
parser = SiteParser()
parser.feed(html_path.read_text(encoding="utf-8"))
parser.close()

errors = []
if parser.duplicate_ids:
    errors.append(f"Duplicate IDs: {', '.join(sorted(parser.duplicate_ids))}")

broken_fragments = sorted(set(parser.fragments) - parser.ids)
if broken_fragments:
    errors.append(f"Broken in-page links: {', '.join(broken_fragments)}")

if parser.gallery_items != 3:
    errors.append(f"Expected 3 gallery images, found {parser.gallery_items}")

if parser.gallery_items_without_captions:
    errors.append("Every gallery image must have a data-caption")

if "typed-text" not in parser.ids:
    errors.append("Hero is missing the #typed-text element")

if not (ROOT / "assets" / "Logo.png").is_file():
    errors.append("The site logo is missing")

for page_name in ("index.html", "exercises.html", "questions.html", "contact.html"):
    page_path = ROOT / page_name
    if not page_path.is_file():
        errors.append(f"The {page_name} page is missing")
        continue

    page_source = page_path.read_text(encoding="utf-8")
    if 'href="contact.html"' not in page_source:
        errors.append(f"The {page_name} page is missing its feedback navigation link")

contact_path = ROOT / "contact.html"
if contact_path.is_file():
    contact_parser = SiteParser()
    contact_parser.feed(contact_path.read_text(encoding="utf-8"))
    contact_parser.close()

    if contact_parser.duplicate_ids:
        errors.append(f"Duplicate IDs in contact.html: {', '.join(sorted(contact_parser.duplicate_ids))}")

    broken_contact_fragments = sorted(set(contact_parser.fragments) - contact_parser.ids)
    if broken_contact_fragments:
        errors.append(f"Broken in-page links in contact.html: {', '.join(broken_contact_fragments)}")

    feedback_fields = {
        field.get("name"): field
        for field in contact_parser.form_fields.get("feedback-form", [])
    }
    required_fields = {"username", "email", "message", "agreement"}
    if not required_fields.issubset(feedback_fields):
        errors.append("The feedback form is missing a required field")
    elif any("required" not in feedback_fields[name] for name in required_fields):
        errors.append("Every required feedback field must have the required attribute")

    if feedback_fields.get("email", {}).get("type") != "email":
        errors.append("The feedback form must use an email input")
    if feedback_fields.get("phone", {}).get("type") != "tel":
        errors.append("The feedback form must use a telephone input")

if errors:
    raise SystemExit("\n".join(errors))

print("Static site validation passed.")
