from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class RequiredDocument(BaseModel):
    name: str = ""
    note: str = ""
    required: bool = True


class ProcedureStep(BaseModel):
    title: str = ""
    description: str = ""
    duration: str = ""
    remarks: str = ""
    order: int = 0
    documents: List[RequiredDocument] = []
    fees: float = 0
    fees_currency: str = ""


class AdditionalDetail(BaseModel):
    title: str = ""
    content: str = ""


class ServiceOffering(BaseModel):
    title: str = ""
    description: str = ""
    cost: float = 0
    currency: str = "GNF"
    delay: str = ""
    included: List[str] = []
    not_included: List[str] = []


class FicheCreate(BaseModel):
    title: str
    country: str = "Guinee"
    category: str = ""
    procedure_type: str = ""
    summary: str = ""
    currency: str = "GNF"
    official_fees: float = 0
    service_cost: float = 0
    estimated_delay: str = ""
    status: str = "draft"
    documents: List[RequiredDocument] = []
    steps: List[ProcedureStep] = []
    additional_details: List[AdditionalDetail] = []
    service_offering: Optional[ServiceOffering] = None


class FicheUpdate(BaseModel):
    title: Optional[str] = None
    country: Optional[str] = None
    category: Optional[str] = None
    procedure_type: Optional[str] = None
    summary: Optional[str] = None
    currency: Optional[str] = None
    official_fees: Optional[float] = None
    service_cost: Optional[float] = None
    estimated_delay: Optional[str] = None
    status: Optional[str] = None
    documents: Optional[List[RequiredDocument]] = None
    steps: Optional[List[ProcedureStep]] = None
    additional_details: Optional[List[AdditionalDetail]] = None
    service_offering: Optional[ServiceOffering] = None


class CompanySettings(BaseModel):
    company_name: str = "Matrix News"
    slogan: str = "Votre partenaire pour toutes vos demarches"
    signature_text: str = "Matrix News - Services Professionnels"
    footer_text: str = "Document genere automatiquement. Pour toute question, contactez-nous."
    default_currency: str = "GNF"
    logo_url: str = "/Matrix.png"
    contact_email: str = ""
    contact_phone: str = ""
    primary_color: str = "#FF6600"
