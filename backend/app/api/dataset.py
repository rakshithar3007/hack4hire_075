"""
Dataset API — public-facing endpoint that returns the complete invoice
fraud detection dataset with all fields needed for the frontend Dataset page.
No authentication required so the Vercel demo loads without login.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.database.session import get_db
from app.models.models import Invoice, FraudAnalysis, ValidationResult, ExtractionResult, Supplier

router = APIRouter(prefix="/dataset", tags=["Dataset"])


@router.get("")
def get_dataset(
    search: Optional[str] = Query(None, description="Search by invoice ID, number, or supplier"),
    fraud_status: Optional[str] = Query(None, description="Filter by fraud risk: LOW, MEDIUM, HIGH"),
    validation_status: Optional[str] = Query(None, description="Filter by validation: PASSED, WARNING, FAILED"),
    approval_status: Optional[str] = Query(None, description="Filter by approval: PENDING, APPROVED, REJECTED, ESCALATED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns the complete invoice fraud detection dataset.
    This is a public endpoint — no JWT required.
    Used by the Dataset page on the frontend.
    """
    query = db.query(Invoice).order_by(desc(Invoice.created_at))

    # Search
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.id.ilike(s),
                Invoice.invoice_number.ilike(s),
            )
        )

    # Filters
    if fraud_status:
        query = query.filter(Invoice.fraud_status.ilike(fraud_status))
    if validation_status:
        query = query.filter(Invoice.validation_status.ilike(validation_status))
    if approval_status:
        query = query.filter(Invoice.approval_status.ilike(approval_status))

    total_count = query.count()
    offset = (page - 1) * page_size
    invoices = query.offset(offset).limit(page_size).all()

    rows = []
    for inv in invoices:
        # Get latest fraud analysis
        fraud = db.query(FraudAnalysis).filter(
            FraudAnalysis.invoice_id == inv.id
        ).order_by(desc(FraudAnalysis.id)).first()

        # Get latest validation
        val = db.query(ValidationResult).filter(
            ValidationResult.invoice_id == inv.id
        ).order_by(desc(ValidationResult.id)).first()

        # Get latest extraction confidence
        ext = db.query(ExtractionResult).filter(
            ExtractionResult.invoice_id == inv.id
        ).order_by(desc(ExtractionResult.attempt_number)).first()

        confidence = None
        if ext and ext.extracted_data:
            confidence = ext.extracted_data.get("overall_confidence")

        rows.append({
            "invoice_id":         inv.id,
            "invoice_number":     inv.invoice_number or "N/A",
            "supplier_name":      inv.supplier.supplier_name if inv.supplier else "Unknown",
            "supplier_gstin":     inv.supplier.gstin if inv.supplier else "N/A",
            "invoice_date":       inv.invoice_date,
            "due_date":           inv.due_date,
            "total_amount":       inv.total_amount or 0.0,
            "department":         inv.department or "General",
            # Processing pipeline statuses
            "processing_status":  inv.processing_status,
            "validation_status":  inv.validation_status,
            "approval_status":    inv.approval_status,
            # Fraud detection result
            "fraud_label":        inv.fraud_status,                          # LOW / MEDIUM / HIGH
            "risk_score":         fraud.risk_score if fraud else None,       # 0–100
            "risk_category":      fraud.risk_category if fraud else inv.fraud_status,
            "fraud_issues_count": len(fraud.detected_issues) if fraud and fraud.detected_issues else 0,
            "fraud_explanation":  fraud.explanation if fraud else None,
            # Validation summary
            "validation_rules_passed": sum(
                1 for r in (val.validation_details or []) if r.get("status") == "PASS"
            ) if val and val.validation_details else None,
            "validation_rules_total": len(val.validation_details or []) if val and val.validation_details else None,
            # OCR confidence
            "extraction_confidence": confidence,
            # Timestamps
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        })

    return {
        "total":     total_count,
        "page":      page,
        "page_size": page_size,
        "pages":     max(1, -(-total_count // page_size)),  # ceiling division
        "data":      rows,
    }


@router.get("/summary")
def get_dataset_summary(db: Session = Depends(get_db)):
    """
    Returns aggregate statistics for the Dataset analytics section.
    Public endpoint — no JWT required.
    """
    total = db.query(func.count(Invoice.id)).scalar() or 0
    total_amount = float(db.query(func.sum(Invoice.total_amount)).scalar() or 0)

    # Fraud distribution
    low    = db.query(func.count(Invoice.id)).filter(Invoice.fraud_status == "LOW").scalar()    or 0
    medium = db.query(func.count(Invoice.id)).filter(Invoice.fraud_status == "MEDIUM").scalar() or 0
    high   = db.query(func.count(Invoice.id)).filter(Invoice.fraud_status == "HIGH").scalar()   or 0
    fraud_pending = db.query(func.count(Invoice.id)).filter(Invoice.fraud_status == "PENDING").scalar() or 0

    # Validation distribution
    val_passed  = db.query(func.count(Invoice.id)).filter(Invoice.validation_status == "PASSED").scalar()  or 0
    val_warning = db.query(func.count(Invoice.id)).filter(Invoice.validation_status == "WARNING").scalar() or 0
    val_failed  = db.query(func.count(Invoice.id)).filter(Invoice.validation_status == "FAILED").scalar()  or 0

    # Approval distribution
    approved  = db.query(func.count(Invoice.id)).filter(Invoice.approval_status == "APPROVED").scalar()  or 0
    pending   = db.query(func.count(Invoice.id)).filter(Invoice.approval_status == "PENDING").scalar()   or 0
    rejected  = db.query(func.count(Invoice.id)).filter(Invoice.approval_status == "REJECTED").scalar()  or 0
    escalated = db.query(func.count(Invoice.id)).filter(Invoice.approval_status == "ESCALATED").scalar() or 0

    # Average risk score
    avg_risk = db.query(func.avg(FraudAnalysis.risk_score)).scalar()
    avg_risk = round(float(avg_risk), 1) if avg_risk else 0.0

    # Fraudulent = MEDIUM + HIGH
    fraudulent_count = medium + high
    fraud_rate = round((fraudulent_count / total * 100), 1) if total > 0 else 0.0

    # Top suppliers by invoice count
    supplier_counts = (
        db.query(Supplier.supplier_name, func.count(Invoice.id).label("count"),
                 func.sum(Invoice.total_amount).label("total_amount"))
        .join(Invoice, Invoice.supplier_id == Supplier.id)
        .group_by(Supplier.id)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )

    return {
        "total_invoices":   total,
        "total_amount":     round(total_amount, 2),
        "legitimate":       low,
        "suspicious":       medium,
        "fraudulent":       high,
        "fraud_pending":    fraud_pending,
        "fraudulent_count": fraudulent_count,
        "fraud_rate":       fraud_rate,
        "avg_risk_score":   avg_risk,
        "validation": {
            "passed":  val_passed,
            "warning": val_warning,
            "failed":  val_failed,
        },
        "approval": {
            "approved":  approved,
            "pending":   pending,
            "rejected":  rejected,
            "escalated": escalated,
        },
        "fraud_distribution": {
            "LOW":     low,
            "MEDIUM":  medium,
            "HIGH":    high,
            "PENDING": fraud_pending,
        },
        "top_suppliers": [
            {
                "name":         s.supplier_name,
                "invoice_count": s.count,
                "total_amount":  round(float(s.total_amount or 0), 2),
            }
            for s in supplier_counts
        ],
    }
