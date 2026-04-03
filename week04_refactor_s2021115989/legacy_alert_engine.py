import time

def generate_alerts(cages):
    alerts = []
    now = time.time()
    DAY = 86400

    for c in cages:
        cage_id = c.get('id', '')
        c_type = c.get('type')
        cs = c.get('currentStatus', {})
        gCount = cs.get('garuiCount', 0)
        dCount = cs.get('damjangCount', 0)

        # 1. 생산 라인 (B1~B8)
        if c_type == 'big':
            num = int(cage_id[1:])
            if num <= 8:
                # 동족포식 위험 (Smell: Magic Numbers & nested if)
                if gCount < 1000 and dCount > 200:
                    alerts.append({"level": "critical", "cage": cage_id, "title": "동족포식 주의"})
                # 가루이 부족
                elif 0 < gCount < 2000 and dCount > 0:
                    alerts.append({"level": "warning", "cage": cage_id, "title": "가루이 부족"})
                # 노린재 증식 정체
                if 0 < dCount < 100:
                    alerts.append({"level": "warning", "cage": cage_id, "title": "노린재 밀도 낮음"})
            
            # 2. 전략 비축 (B9, B10)
            elif num in [9, 10]:
                if gCount >= 5000:
                    alerts.append({"level": "ok", "cage": cage_id, "title": "보급 준비 완료"})
                elif gCount < 1000:
                    alerts.append({"level": "critical", "cage": "B9/B10", "title": "예비 가루이 고갈"})

        # 3. 원자재 공급망 (S)
        elif c_type == 'small':
            logs = c.get('logs', [])
            den_logs = [l for l in logs if l.get('kind') == 'density']
            if den_logs and den_logs[0].get('density') == '많음':
                log_date = den_logs[0].get('timestamp', 0)
                days_since = (now - log_date) / DAY
                if days_since >= 7:
                    alerts.append({"level": "warning", "cage": cage_id, "title": "식물 고사 주의"})
                else:
                    alerts.append({"level": "ok", "cage": cage_id, "title": "이식 대기"})

    return alerts