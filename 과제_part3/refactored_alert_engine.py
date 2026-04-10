from abc import ABC, abstractmethod
import time

# --- 1. 도메인 상수 분리 (Replace Magic Number) ---
class Thresholds:
    CANNIBALISM_GARUI_MAX = 1000
    CANNIBALISM_DAMJANG_MIN = 200
    STARVATION_GARUI_MAX = 2000
    RESERVE_READY_MIN = 5000
    PLANT_DEATH_DAYS = 7
    DAY_IN_SECONDS = 86400

# --- 2. Strategy 인터페이스 정의 (Replace Conditional with Polymorphism) ---
class AlertRule(ABC):
    @abstractmethod
    def evaluate(self, cage, current_time) -> dict:
        pass

# --- 3. 개별 비즈니스 규칙 클래스들 (SRP 준수) ---
class CannibalismRule(AlertRule):
    def evaluate(self, cage, current_time):
        if cage.get('type') != 'big': return None
        num = int(cage['id'][1:])
        if num > 8: return None
        
        cs = cage.get('currentStatus', {})
        if cs.get('garuiCount', 0) < Thresholds.CANNIBALISM_GARUI_MAX and \
           cs.get('damjangCount', 0) > Thresholds.CANNIBALISM_DAMJANG_MIN:
            return {"level": "critical", "cage": cage['id'], "title": "동족포식 주의"}
        return None

class PlantDeathRule(AlertRule):
    def evaluate(self, cage, current_time):
        if cage.get('type') != 'small': return None
        logs = [l for l in cage.get('logs', []) if l.get('kind') == 'density']
        if logs and logs[0].get('density') == '많음':
            days_since = (current_time - logs[0].get('timestamp', 0)) / Thresholds.DAY_IN_SECONDS
            if days_since >= Thresholds.PLANT_DEATH_DAYS:
                return {"level": "warning", "cage": cage['id'], "title": "식물 고사 주의"}
            else:
                return {"level": "ok", "cage": cage['id'], "title": "이식 대기"}
        return None

# --- 4. 알림 생성 엔진 (OCP 준수: 새로운 규칙이 생겨도 이 엔진은 수정 불필요) ---
class AlertEngine:
    def __init__(self):
        # 의존성 주입처럼 사용할 규칙들을 등록
        self.rules = [CannibalismRule(), PlantDeathRule()]

    def generate_alerts(self, cages):
        alerts = []
        now = time.time()
        for cage in cages:
            for rule in self.rules:
                alert = rule.evaluate(cage, now)
                if alert:
                    alerts.append(alert)
        return alerts

# 실행 예시
if __name__ == "__main__":
    dummy_cages = [
        {"id": "B3", "type": "big", "currentStatus": {"garuiCount": 500, "damjangCount": 300}},
        {"id": "S1", "type": "small", "logs": [{"kind": "density", "density": "많음", "timestamp": time.time() - (8*86400)}]}
    ]
    engine = AlertEngine()
    print(engine.generate_alerts(dummy_cages))