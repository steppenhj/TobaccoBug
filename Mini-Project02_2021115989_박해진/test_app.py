import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_critical(client):
    """가루이 < 1000 and 노린재 > 200 → CRITICAL"""
    response = client.post(
        "/api/evaluate_risk",
        json={"damjang": 201, "garui": 999},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "CRITICAL"
    assert data["message"] == "동족포식 위험"


def test_warning(client):
    """노린재 >= 1 and 가루이 < 2000 (CRITICAL 아님) → WARNING"""
    response = client.post(
        "/api/evaluate_risk",
        json={"damjang": 1, "garui": 1500},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "WARNING"
    assert data["message"] == "가루이 부족"


def test_safe(client):
    """위 두 조건 모두 해당 없음 → SAFE"""
    response = client.post(
        "/api/evaluate_risk",
        json={"damjang": 0, "garui": 3000},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "SAFE"
    assert data["message"] == "안전"


def test_bad_request_missing_field(client):
    """필드 누락 → 400"""
    response = client.post(
        "/api/evaluate_risk",
        json={"damjang": 100},
    )
    assert response.status_code == 400


def test_bad_request_negative_value(client):
    """음수 입력 → 400"""
    response = client.post(
        "/api/evaluate_risk",
        json={"damjang": -1, "garui": 500},
    )
    assert response.status_code == 400
