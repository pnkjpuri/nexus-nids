from app.services.correlation import generate_audit_hash

def test_audit_hash_chain():
    prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    hash1 = generate_audit_hash(prev_hash, "user-123", "LOGIN", {"ip": "192.168.1.1"})
    hash2 = generate_audit_hash(hash1, "user-123", "UPDATE_ROLE", {"new_role": "Analyst"})
    
    assert len(hash1) == 64
    assert len(hash2) == 64
    assert hash1 != hash2