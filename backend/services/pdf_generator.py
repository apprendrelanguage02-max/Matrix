import io
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable, KeepTogether
)
from datetime import datetime, timezone

# ─── Premium Color Palette ────────────────────────────────────────────────────
ORANGE = HexColor("#FF6600")
DARK_ORANGE = HexColor("#E55B00")
LIGHT_ORANGE = HexColor("#FFF7ED")
DARK = HexColor("#111111")
MEDIUM = HexColor("#333333")
GRAY = HexColor("#6B7280")
LIGHT_GRAY = HexColor("#F3F4F6")
BORDER = HexColor("#E5E7EB")
WHITE = white
BLACK = black
ACCENT_BG = HexColor("#FEF3E2")


def get_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "CompanyName", fontName="Helvetica-Bold", fontSize=20,
        textColor=DARK, alignment=TA_CENTER, spaceAfter=2, leading=24
    ))
    styles.add(ParagraphStyle(
        "Slogan", fontName="Helvetica", fontSize=9,
        textColor=GRAY, alignment=TA_CENTER, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        "DocTitle", fontName="Helvetica-Bold", fontSize=15,
        textColor=WHITE, alignment=TA_CENTER, leading=20
    ))
    styles.add(ParagraphStyle(
        "SectionTitle", fontName="Helvetica-Bold", fontSize=11,
        textColor=DARK, spaceBefore=14, spaceAfter=6, leading=14
    ))
    styles.add(ParagraphStyle(
        "Body", fontName="Helvetica", fontSize=9,
        textColor=MEDIUM, leading=13, spaceAfter=3
    ))
    styles.add(ParagraphStyle(
        "BodyBold", fontName="Helvetica-Bold", fontSize=9,
        textColor=DARK, leading=13, spaceAfter=3
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
        "Footer", fontName="Helvetica", fontSize=7.5,
        textColor=GRAY, alignment=TA_CENTER, leading=10
    ))
    styles.add(ParagraphStyle(
        "MetaLabel", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=GRAY, alignment=TA_CENTER, leading=10
    ))
    styles.add(ParagraphStyle(
        "MetaValue", fontName="Helvetica-Bold", fontSize=8.5,
        textColor=DARK, alignment=TA_CENTER, leading=11
    ))
    return styles


def load_logo(settings: dict):
    """Load logo from local static files. No HTTP requests needed."""
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    frontend_public = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public")

    logo_url = settings.get("logo_url", "/Matrix.png")
    filename = logo_url.split("/")[-1] if "/" in logo_url else logo_url

    for search_dir in [static_dir, frontend_public]:
        for fname in [filename, "Matrix.png"]:
            path = os.path.join(search_dir, fname)
            if os.path.exists(path):
                return path
    return None


def build_section_title(title: str, styles):
    """Orange left-border section title."""
    data = [[
        "",
        Paragraph(title.upper(), styles["SectionTitle"])
    ]]
    t = Table(data, colWidths=[3 * mm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), ORANGE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (1, 0), (1, 0), 8),
    ]))
    return t


def generate_fiche_pdf(fiche: dict, settings: dict) -> bytes:
    buffer = io.BytesIO()
    styles = get_styles()
    currency = fiche.get("currency", "GNF")

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=22 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
        title=fiche.get("title", "Fiche de Procedure"),
        author=settings.get("company_name", "Matrix News"),
    )

    story = []
    page_w = A4[0] - 36 * mm

    # ═══════════════════════════════════════════════════════════════════════
    # HEADER — Logo + Company + Separator
    # ═══════════════════════════════════════════════════════════════════════
    logo_path = load_logo(settings)
    if logo_path:
        try:
            logo_img = Image(logo_path, width=42 * mm, height=16 * mm, kind="proportional")
            logo_img.hAlign = "CENTER"
            story.append(logo_img)
            story.append(Spacer(1, 2 * mm))
        except Exception:
            pass

    company = settings.get("company_name", "Matrix News")
    slogan = settings.get("slogan", "")
    story.append(Paragraph(company, styles["CompanyName"]))
    if slogan:
        story.append(Paragraph(slogan, styles["Slogan"]))

    # Elegant double-line separator
    story.append(Spacer(1, 2 * mm))
    story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=1))
    story.append(HRFlowable(width="60%", thickness=0.5, color=BORDER, spaceAfter=4))

    # ═══════════════════════════════════════════════════════════════════════
    # TITLE BANNER
    # ═══════════════════════════════════════════════════════════════════════
    title_text = fiche.get("title", "Fiche de Procedure")
    title_data = [[Paragraph(f"<b>{title_text}</b>", styles["DocTitle"])]]
    title_table = Table(title_data, colWidths=[page_w])
    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ORANGE),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(title_table)

    # ═══════════════════════════════════════════════════════════════════════
    # META INFO CARDS
    # ═══════════════════════════════════════════════════════════════════════
    meta_pairs = []
    if fiche.get("country"):
        meta_pairs.append(("Pays", fiche["country"]))
    if fiche.get("category"):
        meta_pairs.append(("Categorie", fiche["category"]))
    if fiche.get("procedure_type"):
        meta_pairs.append(("Type", fiche["procedure_type"]))
    if fiche.get("estimated_delay"):
        meta_pairs.append(("Delai estime", fiche["estimated_delay"]))

    if meta_pairs:
        story.append(Spacer(1, 3 * mm))
        n = len(meta_pairs)
        col_w = page_w / n
        labels = [Paragraph(p[0].upper(), styles["MetaLabel"]) for p in meta_pairs]
        values = [Paragraph(f"<b>{p[1]}</b>", styles["MetaValue"]) for p in meta_pairs]
        meta_table = Table([labels, values], colWidths=[col_w] * n)
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("TOPPADDING", (0, 0), (-1, 0), 5),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 1),
            ("TOPPADDING", (0, 1), (-1, 1), 1),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBEFORE", (1, 0), (-1, -1), 0.5, BORDER),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ]))
        story.append(meta_table)

    # ═══════════════════════════════════════════════════════════════════════
    # RESUME
    # ═══════════════════════════════════════════════════════════════════════
    if fiche.get("summary"):
        story.append(Spacer(1, 5 * mm))
        story.append(build_section_title("Resume", styles))
        story.append(Spacer(1, 2 * mm))
        # Summary in a subtle box
        sum_data = [[Paragraph(fiche["summary"], styles["Body"])]]
        sum_table = Table(sum_data, colWidths=[page_w])
        sum_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), ACCENT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("ROUNDEDCORNERS", [2, 2, 2, 2]),
        ]))
        story.append(sum_table)

    # ═══════════════════════════════════════════════════════════════════════
    # ETAPES (with documents & fees per step)
    # ═══════════════════════════════════════════════════════════════════════
    steps = fiche.get("steps", [])
    total_step_fees = 0
    if steps:
        story.append(Spacer(1, 4 * mm))
        story.append(build_section_title("Etapes de la Procedure", styles))
        story.append(Spacer(1, 2 * mm))

        sorted_steps = sorted(steps, key=lambda s: s.get("order", 0))
        for i, step in enumerate(sorted_steps):
            step_title = step.get("title", f"Etape {i + 1}")

            # Step number badge
            num_style = ParagraphStyle(
                f"Num{i}", fontName="Helvetica-Bold", fontSize=10,
                textColor=WHITE, alignment=TA_CENTER
            )
            num_data = [[Paragraph(str(i + 1), num_style)]]
            num_table = Table(num_data, colWidths=[9 * mm], rowHeights=[9 * mm])
            num_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), ORANGE),
                ("ALIGN", (0, 0), (0, 0), "CENTER"),
                ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
                ("ROUNDEDCORNERS", [2, 2, 2, 2]),
            ]))

            # Step content
            content = []
            title_s = ParagraphStyle(
                f"ST{i}", fontName="Helvetica-Bold", fontSize=10.5,
                textColor=DARK, leading=13
            )
            content.append(Paragraph(step_title, title_s))

            if step.get("duration"):
                content.append(Paragraph(
                    f'<font color="#FF6600">Duree estimee : {step["duration"]}</font>',
                    styles["Small"]
                ))

            if step.get("description"):
                content.append(Spacer(1, 1.5 * mm))
                content.append(Paragraph(step["description"], styles["Body"]))

            if step.get("remarks"):
                content.append(Spacer(1, 1 * mm))
                remark_data = [[Paragraph(
                    f'<b>Important :</b> {step["remarks"]}',
                    ParagraphStyle(f"Rem{i}", fontName="Helvetica", fontSize=8, textColor=HexColor("#B91C1C"), leading=11)
                )]]
                remark_table = Table(remark_data, colWidths=[page_w - 16 * mm])
                remark_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#FEF2F2")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("ROUNDEDCORNERS", [2, 2, 2, 2]),
                ]))
                content.append(remark_table)

            # Documents for this step
            step_docs = step.get("documents", [])
            if step_docs:
                content.append(Spacer(1, 2 * mm))
                content.append(Paragraph(
                    '<font color="#FF6600"><b>Documents requis :</b></font>',
                    styles["SmallBold"]
                ))
                for d in step_docs:
                    req_text = '<font color="#FF6600"><b>[OBLIGATOIRE]</b></font>' if d.get("required", True) else '<font color="#999999">[Optionnel]</font>'
                    doc_name = d.get("name", "Document")
                    content.append(Paragraph(
                        f'&nbsp;&nbsp;&bull;&nbsp; {doc_name} &nbsp;{req_text}',
                        styles["Small"]
                    ))
                    if d.get("note"):
                        content.append(Paragraph(
                            f'&nbsp;&nbsp;&nbsp;&nbsp;<i><font color="#9CA3AF">{d["note"]}</font></i>',
                            styles["Small"]
                        ))

            # Fees for this step
            step_fee = step.get("fees", 0)
            if step_fee:
                total_step_fees += step_fee
                step_currency = step.get("fees_currency") or currency
                content.append(Spacer(1, 1.5 * mm))
                fee_data = [[Paragraph(
                    f'Frais : <b>{step_fee:,.0f} {step_currency}</b>',
                    ParagraphStyle(f"SF{i}", fontName="Helvetica-Bold", fontSize=8.5, textColor=DARK, leading=11)
                )]]
                fee_table = Table(fee_data, colWidths=[page_w - 16 * mm])
                fee_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), LIGHT_ORANGE),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("ROUNDEDCORNERS", [2, 2, 2, 2]),
                ]))
                content.append(fee_table)

            # Assemble step row
            step_row = [[num_table, content]]
            step_table = Table(step_row, colWidths=[13 * mm, page_w - 15 * mm])
            step_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(KeepTogether([step_table, Spacer(1, 1 * mm)]))

            # Subtle separator between steps
            if i < len(sorted_steps) - 1:
                story.append(HRFlowable(
                    width="85%", thickness=0.3, color=BORDER,
                    spaceBefore=1, spaceAfter=3
                ))

    # ═══════════════════════════════════════════════════════════════════════
    # ADDITIONAL DETAILS
    # ═══════════════════════════════════════════════════════════════════════
    details = fiche.get("additional_details", [])
    if details:
        for detail in details:
            if detail.get("title") and detail.get("content"):
                story.append(Spacer(1, 3 * mm))
                story.append(build_section_title(detail["title"], styles))
                story.append(Spacer(1, 1 * mm))
                story.append(Paragraph(detail["content"], styles["Body"]))

    # ═══════════════════════════════════════════════════════════════════════
    # SERVICE OFFERING
    # ═══════════════════════════════════════════════════════════════════════
    svc = fiche.get("service_offering")
    if svc and (svc.get("title") or svc.get("description")):
        story.append(Spacer(1, 4 * mm))
        story.append(build_section_title("Notre Prestation de Service", styles))
        story.append(Spacer(1, 2 * mm))

        svc_content = []
        if svc.get("title"):
            svc_content.append(Paragraph(f'<b>{svc["title"]}</b>', styles["BodyBold"]))
        if svc.get("description"):
            svc_content.append(Paragraph(svc["description"], styles["Body"]))

        svc_currency = svc.get("currency", currency)
        info_parts = []
        if svc.get("cost"):
            info_parts.append(f'<b>Cout :</b> {svc["cost"]:,.0f} {svc_currency}')
        if svc.get("delay"):
            info_parts.append(f'<b>Delai :</b> {svc["delay"]}')
        if info_parts:
            svc_content.append(Paragraph(" &nbsp;|&nbsp; ".join(info_parts), styles["Body"]))

        if svc.get("included"):
            svc_content.append(Spacer(1, 1 * mm))
            svc_content.append(Paragraph("<b>Inclus :</b>", styles["SmallBold"]))
            for item in svc["included"]:
                svc_content.append(Paragraph(
                    f'<font color="#16A34A">&bull;</font> {item}', styles["Body"]
                ))

        if svc.get("not_included"):
            svc_content.append(Spacer(1, 1 * mm))
            svc_content.append(Paragraph("<b>Non inclus :</b>", styles["SmallBold"]))
            for item in svc["not_included"]:
                svc_content.append(Paragraph(
                    f'<font color="#DC2626">&bull;</font> {item}', styles["Body"]
                ))

        svc_box_data = [[svc_content]]
        svc_box = Table(svc_box_data, colWidths=[page_w])
        svc_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROUNDEDCORNERS", [3, 3, 3, 3]),
        ]))
        story.append(svc_box)

    # ═══════════════════════════════════════════════════════════════════════
    # FEES SUMMARY — Bottom of document
    # ═══════════════════════════════════════════════════════════════════════
    official = fiche.get("official_fees", 0)
    service = fiche.get("service_cost", 0)
    if total_step_fees or official or service:
        story.append(Spacer(1, 5 * mm))
        story.append(build_section_title("Recapitulatif des Frais", styles))
        story.append(Spacer(1, 2 * mm))

        fees_rows = []
        label_s = ParagraphStyle("FL", fontName="Helvetica", fontSize=9, textColor=MEDIUM)
        value_s = ParagraphStyle("FV", fontName="Helvetica-Bold", fontSize=9, textColor=DARK, alignment=TA_RIGHT)

        # Per-step fees
        if total_step_fees:
            sorted_for_fees = sorted(steps, key=lambda s: s.get("order", 0))
            for idx, step in enumerate(sorted_for_fees):
                sf = step.get("fees", 0)
                if sf:
                    step_curr = step.get("fees_currency") or currency
                    fees_rows.append([
                        Paragraph(f"Etape {idx + 1} : {step.get('title', '')}", label_s),
                        Paragraph(f"{sf:,.0f} {step_curr}", value_s)
                    ])
            fees_rows.append([
                Paragraph("<b>Sous-total des etapes</b>", ParagraphStyle("FSL", fontName="Helvetica-Bold", fontSize=9, textColor=ORANGE)),
                Paragraph(f"<b>{total_step_fees:,.0f} {currency}</b>", ParagraphStyle("FSV", fontName="Helvetica-Bold", fontSize=9, textColor=ORANGE, alignment=TA_RIGHT))
            ])

        if official:
            fees_rows.append([
                Paragraph("Frais officiels de traitement", label_s),
                Paragraph(f"<b>{official:,.0f} {currency}</b>", value_s)
            ])
        if service:
            fees_rows.append([
                Paragraph("Cout de la prestation", label_s),
                Paragraph(f"<b>{service:,.0f} {currency}</b>", value_s)
            ])

        # Grand total row
        grand_total = total_step_fees + official + service
        total_label_s = ParagraphStyle("TL", fontName="Helvetica-Bold", fontSize=12, textColor=DARK)
        total_val_s = ParagraphStyle("TV", fontName="Helvetica-Bold", fontSize=12, textColor=ORANGE, alignment=TA_RIGHT)
        fees_rows.append([
            Paragraph("TOTAL GENERAL", total_label_s),
            Paragraph(f"{grand_total:,.0f} {currency}", total_val_s)
        ])

        fees_table = Table(fees_rows, colWidths=[page_w * 0.62, page_w * 0.38])
        row_styles = [
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER),
            # Total row highlight
            ("BACKGROUND", (0, -1), (-1, -1), LIGHT_ORANGE),
            ("LINEABOVE", (0, -1), (-1, -1), 1.5, ORANGE),
            ("TOPPADDING", (0, -1), (-1, -1), 8),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
            # Outer box
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROUNDEDCORNERS", [3, 3, 3, 3]),
        ]
        fees_table.setStyle(TableStyle(row_styles))
        story.append(fees_table)

    # ═══════════════════════════════════════════════════════════════════════
    # FOOTER — Signature + Date + Fine line
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 12 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4))

    if settings.get("signature_text"):
        story.append(Paragraph(
            settings["signature_text"],
            ParagraphStyle("Sig", fontName="Helvetica-Bold", fontSize=9.5, textColor=DARK, alignment=TA_RIGHT)
        ))
        story.append(Spacer(1, 1 * mm))

    gen_date = datetime.now(timezone.utc).strftime("%d/%m/%Y a %H:%M UTC")
    story.append(Paragraph(f"Document genere le {gen_date}", styles["Footer"]))

    if settings.get("footer_text"):
        story.append(Spacer(1, 1.5 * mm))
        story.append(Paragraph(settings["footer_text"], styles["Footer"]))

    if settings.get("contact_email") or settings.get("contact_phone"):
        contact_parts = []
        if settings.get("contact_email"):
            contact_parts.append(settings["contact_email"])
        if settings.get("contact_phone"):
            contact_parts.append(settings["contact_phone"])
        story.append(Paragraph(" | ".join(contact_parts), styles["Footer"]))

    # ═══════════════════════════════════════════════════════════════════════
    # BUILD
    # ═══════════════════════════════════════════════════════════════════════
    doc.build(story)
    return buffer.getvalue()
