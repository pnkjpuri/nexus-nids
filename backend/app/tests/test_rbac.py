from app.services.cia_mapping import calculate_cia_impact

def test_cia_impact_mapping():
    denial_impact = calculate_cia_impact("Denial of Service", "Critical")
    assert denial_impact["availability"] == "HIGH"

    exploit_impact = calculate_cia_impact("Web Application Attack", "High")
    assert exploit_impact["confidentiality"] == "HIGH"
    assert exploit_impact["integrity"] == "HIGH"