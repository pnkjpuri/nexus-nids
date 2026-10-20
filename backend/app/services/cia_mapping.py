def calculate_cia_impact(category: str, severity: str) -> dict:
    cat_lower = category.lower()
    sev_lower = severity.lower()

    conf = "LOW"
    integ = "LOW"
    avail = "LOW"

    if "denial" in cat_lower or "flood" in cat_lower or "dos" in cat_lower:
        avail = "HIGH" if sev_lower in ["critical", "high"] else "MEDIUM"
    elif any(k in cat_lower for k in ["exploit", "injection", "overflow", "web application attack", "attack"]):
        conf = "HIGH"
        integ = "HIGH"
        avail = "MEDIUM"
    elif any(k in cat_lower for k in ["leak", "scan", "reconnaissance", "information"]):
        conf = "MEDIUM" if "scan" in cat_lower else "HIGH"

    return {
        "confidentiality": conf,
        "integrity": integ,
        "availability": avail
    }