import io
import os
import requests
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable, KeepTogether, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime, timezone

ORANGE = HexColor("#FF6600")
DARK = HexColor("#1a1a1a")
GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#f5f5f5")
LIGHT_ORANGE = HexColor("#FFF3E8")
WHITE = white
BORDER_COLOR = HexColor("#e0e0e0")


def get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "DocTitle", fontName="Helvetica-Bold", fontSize=18,
        textColor=DARK, alignment=TA_CENTER, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        "DocSubtitle", fontName="Helvetica", fontSize=10,
        textColor=GRAY, alignment=TA_CENTER, spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        "SectionTitle", fontName="Helvetica-Bold", fontSize=13,
        textColor=ORANGE, spaceBefore=16, spaceAfter=8,
        borderWidth=0, leftIndent=0
    ))
    styles.add(ParagraphStyle(
        "SubSection", fontName="Helvetica-Bold", fontSize=10,
        textColor=DARK, spaceBefore=8, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        "BodyText2", fontName="Helvetica", fontSize=9.5,
        textColor=DARK, leading=14, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        "Small", fontName="Helvetica", fontSize=8,
        textColor=GRAY, leading=11
    ))
    styles.add(ParagraphStyle(
        "SmallBold", fontName="Helvetica-Bold", fontSize=8,
        textColor=DARK, leading=11
    ))
    styles.add(ParagraphStyle(
        "CenterSmall", fontName="Helvetica", fontSize=8,
        textColor=GRAY, alignment=TA_CENTER, leading=11
    ))
    return styles


def fetch_logo(logo_url: str, backend_url: str = None):
    try:
        if logo_url.startswith("/"):
            base = backend_url or os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000")
            full_url = f"{base}{logo_url}"
        else:
            full_url = logo_url
        resp = requests.get(full_url, timeout=5)
        if resp.status_code == 200:
            return io.BytesIO(resp.content)
    except Exception:
        pass
    logo_path = os.path.join(os.path.dirname(__file__), "..", "static", "nimba-logo.png")
    if os.path.exists(logo_path):
        return open(logo_path, "rb")
    return None


def build_section_header(title: str, styles):
    return Paragraph(f'<font color="#FF6600">&#9632;</font> {title}', styles["SectionTitle"])


def generate_fiche_pdf(fiche: dict, settings: dict) -> bytes:
    buffer = io.BytesIO()
    styles = get_styles()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=25 * mm,
        leftMargin=20 * mm, rightMargin=20 * mm,
        title=fiche.get("title", "Fiche de Procedure"),
        author=settings.get("company_name", "Matrix News"),
    )

    story = []
    page_w = A4[0] - 40 * mm

    # ─── Header with logo ───────────────────────────────────────────────
    logo_data = fetch_logo(settings.get("logo_url", "/nimba-logo.png"))
    header_parts = []
    if logo_data:
        try:
            logo_img = Image(logo_data, width=40 * mm, height=15 * mm)
            logo_img.hAlign = "CENTER"
            header_parts.append(logo_img)
            header_parts.append(Spacer(1, 3 * mm))
        except Exception:
            pass

    header_parts.append(Paragraph(settings.get("company_name", "Matrix News"), styles["DocTitle"]))
    header_parts.append(Paragraph(settings.get("slogan", ""), styles["DocSubtitle"]))
    header_parts.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=6))
    for p in header_parts:
        story.append(p)

    # ─── Title block ─────────────────────────────────────────────────────
    title_data = [[Paragraph(f'<b>{fiche.get("title", "Fiche de Procedure")}</b>', ParagraphStyle(
        "TitleBlock", fontName="Helvetica-Bold", fontSize=16, textColor=white, alignment=TA_CENTER
    ))]]
    title_table = Table(title_data, colWidths=[page_w])
    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ORANGE),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(title_table)

    # ─── Meta info row ──────────────────────────────────────────────────
    meta_items = []
    if fiche.get("country"):
        meta_items.append(f"<b>Pays:</b> {fiche['country']}")
    if fiche.get("category"):
        meta_items.append(f"<b>Categorie:</b> {fiche['category']}")
    if fiche.get("procedure_type"):
        meta_items.append(f"<b>Type:</b> {fiche['procedure_type']}")
    if fiche.get("estimated_delay"):
        meta_items.append(f"<b>Delai:</b> {fiche['estimated_delay']}")
    if meta_items:
        story.append(Spacer(1, 3 * mm))
        meta_cols = min(len(meta_items), 4)
        col_w = page_w / meta_cols
        meta_data = [[Paragraph(m, ParagraphStyle("Meta", fontName="Helvetica", fontSize=8, textColor=GRAY, alignment=TA_CENTER)) for m in meta_items[:4]]]
        meta_table = Table(meta_data, colWidths=[col_w] * meta_cols)
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ]))
        story.append(meta_table)

    # ─── Summary ─────────────────────────────────────────────────────────
    if fiche.get("summary"):
        story.append(Spacer(1, 4 * mm))
        story.append(build_section_header("Resume", styles))
        story.append(Paragraph(fiche["summary"], styles["BodyText2"]))

    # ─── Steps (with documents & fees per step) ──────────────────────────
    steps = fiche.get("steps", [])
    total_step_fees = 0
    if steps:
        story.append(Spacer(1, 2 * mm))
        story.append(build_section_header("Etapes de la Procedure", styles))
        sorted_steps = sorted(steps, key=lambda s: s.get("order", 0))
        for i, step in enumerate(sorted_steps):
            step_title = step.get("title", f"Etape {i + 1}")
            num_style = ParagraphStyle("StepNum", fontName="Helvetica-Bold", fontSize=9, textColor=white, alignment=TA_CENTER)
            title_style = ParagraphStyle("StepTitle", fontName="Helvetica-Bold", fontSize=10, textColor=DARK)

            num_data = [[Paragraph(f"<b>{i + 1}</b>", num_style)]]
            num_table = Table(num_data, colWidths=[8 * mm], rowHeights=[8 * mm])
            num_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), ORANGE),
                ("ALIGN", (0, 0), (0, 0), "CENTER"),
                ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
                ("ROUNDEDCORNERS", [3, 3, 3, 3]),
            ]))

            content_parts = [Paragraph(step_title, title_style)]
            if step.get("duration"):
                content_parts.append(Paragraph(f'<font color="#FF6600">Duree: {step["duration"]}</font>', styles["Small"]))
            if step.get("description"):
                content_parts.append(Spacer(1, 1 * mm))
                content_parts.append(Paragraph(step["description"], styles["BodyText2"]))
            if step.get("remarks"):
                content_parts.append(Paragraph(f'<font color="#cc0000"><b>Important:</b> {step["remarks"]}</font>', styles["Small"]))

            # Documents required for this step
            step_docs = step.get("documents", [])
            if step_docs:
                content_parts.append(Spacer(1, 2 * mm))
                content_parts.append(Paragraph('<font color="#FF6600"><b>Documents requis :</b></font>', styles["Small"]))
                for d in step_docs:
                    badge = '<font color="#FF6600"><b>OBLIGATOIRE</b></font>' if d.get("required", True) else '<font color="#666666">Optionnel</font>'
                    content_parts.append(Paragraph(f'  - {d.get("name", "Document")}  ({badge})', styles["Small"]))
                    if d.get("note"):
                        content_parts.append(Paragraph(f'    <i><font color="#888888">{d["note"]}</font></i>', styles["Small"]))

            # Fees for this step
            step_fee = step.get("fees", 0)
            if step_fee:
                total_step_fees += step_fee
                content_parts.append(Spacer(1, 1 * mm))
                content_parts.append(Paragraph(f'<font color="#FF6600"><b>Frais de traitement : {step_fee:,.0f} {currency}</b></font>', styles["Small"]))

            step_data = [[num_table, content_parts]]
            step_table = Table(step_data, colWidths=[12 * mm, page_w - 14 * mm])
            step_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(KeepTogether([step_table, Spacer(1, 2 * mm)]))

    # ─── Additional details ──────────────────────────────────────────────
    details = fiche.get("additional_details", [])
    if details:
        for detail in details:
            if detail.get("title") and detail.get("content"):
                story.append(Spacer(1, 2 * mm))
                story.append(build_section_header(detail["title"], styles))
                story.append(Paragraph(detail["content"], styles["BodyText2"]))

    # ─── Service Offering ────────────────────────────────────────────────
    svc = fiche.get("service_offering")
    if svc and (svc.get("title") or svc.get("description")):
        story.append(Spacer(1, 4 * mm))
        story.append(build_section_header("Notre Prestation de Service", styles))
        if svc.get("title"):
            story.append(Paragraph(f'<b>{svc["title"]}</b>', styles["SubSection"]))
        if svc.get("description"):
            story.append(Paragraph(svc["description"], styles["BodyText2"]))
        svc_currency = svc.get("currency", currency)
        svc_info = []
        if svc.get("cost"):
            svc_info.append(f"<b>Cout:</b> {svc['cost']:,.0f} {svc_currency}")
        if svc.get("delay"):
            svc_info.append(f"<b>Delai:</b> {svc['delay']}")
        if svc_info:
            story.append(Paragraph(" | ".join(svc_info), styles["BodyText2"]))
        if svc.get("included"):
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph("<b>Ce qui est inclus:</b>", styles["SmallBold"]))
            for item in svc["included"]:
                story.append(Paragraph(f'<font color="#FF6600">&#10003;</font> {item}', styles["BodyText2"]))
        if svc.get("not_included"):
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph("<b>Ce qui n'est pas inclus:</b>", styles["SmallBold"]))
            for item in svc["not_included"]:
                story.append(Paragraph(f'<font color="#cc0000">&#10007;</font> {item}', styles["BodyText2"]))

    # ─── FEES — at the very bottom ─────────────────────────────────────
    currency = fiche.get("currency", "GNF")
    official = fiche.get("official_fees", 0)
    service = fiche.get("service_cost", 0)
    if total_step_fees or official or service:
        story.append(Spacer(1, 4 * mm))
        story.append(build_section_header("Frais et Couts", styles))
        fees_data = []

        # Per-step fees breakdown
        if total_step_fees:
            sorted_for_fees = sorted(steps, key=lambda s: s.get("order", 0))
            for i, step in enumerate(sorted_for_fees):
                sf = step.get("fees", 0)
                if sf:
                    fees_data.append([
                        Paragraph(f"Etape {i + 1} : {step.get('title', '')}", styles["Small"]),
                        Paragraph(f"<b>{sf:,.0f} {currency}</b>", ParagraphStyle(f"SF{i}", fontName="Helvetica-Bold", fontSize=9, textColor=DARK, alignment=TA_RIGHT))
                    ])
            fees_data.append([
                Paragraph("<b>Sous-total frais des etapes</b>", styles["SmallBold"]),
                Paragraph(f"<b>{total_step_fees:,.0f} {currency}</b>", ParagraphStyle("SubTot", fontName="Helvetica-Bold", fontSize=9, textColor=ORANGE, alignment=TA_RIGHT))
            ])

        if official:
            fees_data.append([
                Paragraph("Frais officiels de traitement", styles["SmallBold"]),
                Paragraph(f"<b>{official:,.0f} {currency}</b>", ParagraphStyle("FeeVal", fontName="Helvetica-Bold", fontSize=9, textColor=DARK, alignment=TA_RIGHT))
            ])
        if service:
            fees_data.append([
                Paragraph("Cout de la prestation", styles["SmallBold"]),
                Paragraph(f"<b>{service:,.0f} {currency}</b>", ParagraphStyle("FeeVal2", fontName="Helvetica-Bold", fontSize=9, textColor=DARK, alignment=TA_RIGHT))
            ])

        grand_total = total_step_fees + official + service
        fees_data.append([
            Paragraph("<b>TOTAL GENERAL</b>", ParagraphStyle("TotLabel", fontName="Helvetica-Bold", fontSize=11, textColor=DARK)),
            Paragraph(f"<b>{grand_total:,.0f} {currency}</b>", ParagraphStyle("TotVal", fontName="Helvetica-Bold", fontSize=11, textColor=ORANGE, alignment=TA_RIGHT))
        ])
        fees_table = Table(fees_data, colWidths=[page_w * 0.65, page_w * 0.35])
        fees_table.setStyle(TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER_COLOR),
            ("BACKGROUND", (0, -1), (-1, -1), LIGHT_ORANGE),
            ("LINEABOVE", (0, -1), (-1, -1), 1.5, ORANGE),
        ]))
        story.append(fees_table)

    # ─── Signature ───────────────────────────────────────────────────────
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=4))
    if settings.get("signature_text"):
        story.append(Paragraph(settings["signature_text"], ParagraphStyle(
            "Sig", fontName="Helvetica-Bold", fontSize=10, textColor=DARK, alignment=TA_RIGHT
        )))
    gen_date = datetime.now(timezone.utc).strftime("%d/%m/%Y a %H:%M UTC")
    story.append(Paragraph(f"Document genere le {gen_date}", styles["CenterSmall"]))
    if settings.get("footer_text"):
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(settings["footer_text"], styles["CenterSmall"]))

    # ─── Build ───────────────────────────────────────────────────────────
    doc.build(story)
    return buffer.getvalue()
