🪲 TobaccoBug: 담배장님노린재 사육 관리 시스템
"본전공(생물/농학)과 복수전공(컴퓨터공학)의 콜라보레이션" 🌿💻
담배장님노린재(Nesidiocoris tenuis) 포식자-먹이 사육 데이터를 체계적으로 기록하고 관리하기 위해 개발된 Flask 기반 웹 애플리케이션입니다.

## 📸 Visual Demonstration

![TobaccoBug 대시보드 화면 캡쳐](assets/dashboard.jpg)

🎯 Motivation & Problem
담배장님노린재는 해충 방제에 탁월한 천적 곤충이지만, 포식자와 먹이(가루이 등)의 비율, 동족포식 위험, 케이지별 밀도 등을 정밀하게 관리해야만 성공적으로 사육할 수 있습니다.

기존의 수기 기록 방식은 데이터 누락이 발생하기 쉽고, 실시간으로 위험(예: 먹이 부족 현상)을 파악하기 어려웠습니다. 이를 해결하기 위해 사육 데이터를 디지털화하고, 이상 상황을 즉각 알림으로 받아볼 수 있는 전용 사육 관리 시스템의 필요성을 느껴 본 애플리케이션을 개발하게 되었습니다.

🛠 Tech Stack & Rationale
Backend: Python & Flask — 빠르고 가볍게 REST API와 웹 서버를 구축하기 위해 선택했습니다.

Database: SQLite — 별도의 무거운 DB 서버 구축 없이, 로컬 환경에서 간편하게 사육 데이터를 저장하기 위해 채택했습니다.

Frontend: HTML/CSS, Vanilla JS (ES Modules) — 복잡한 프레임워크 없이도 모듈화를 통해 상태 관리 및 UI 렌더링을 효율적으로 구현했습니다.

API Docs: Swagger UI — API 테스트와 문서화를 동시에 진행하여 백엔드 개발 및 테스트 효율을 높였습니다.

CI/CD & Docs: Sphinx & GitHub Actions — 기술 문서를 코드로 관리하고, GitHub Pages에 자동 배포하여 항상 최신 상태의 문서를 유지합니다.

✨ Key Features
케이지 대시보드: 사육(Big), 가루이 증식(Small), 페트리 디쉬(Petri) 등 다양한 형태의 케이지 상태를 한눈에 모니터링합니다.

활동 로그 관리: 개체 투입, 방사, 밀도 변화 및 특이사항 메모 등 필수 사육 기록을 손쉽게 추가하고 삭제할 수 있습니다.

행동 강령 알림 (Smart Warnings): 동족포식 위험, 가루이(먹이) 부족 등 사육에 치명적인 상황을 방지하기 위한 자동 경고 패널을 제공합니다.

RESTful API: Swagger UI를 통해 직관적인 환경에서 6개의 주요 API 엔드포인트를 직접 테스트해 볼 수 있습니다.

🚀 Getting Started Guide
1. 로컬 환경 실행
Bash
# 저장소 클론
git clone https://github.com/steppenhj/TobaccoBug.git
cd TobaccoBug/my-flask-project

# 의존성 패키지 설치
pip install -r requirements.txt

# 서버 실행
python app.py
서버 실행 후, 브라우저에서 http://localhost:5000으로 접속합니다.
먼저 cd c:/plant_medicine/my-flask-project를 해야 할 수도 있습니다.

2. API 문서 확인
서버 구동 상태에서 http://localhost:5000/apidocs에 접속하면 인터랙티브한 Swagger UI를 사용할 수 있습니다.

3. 기술 문서 확인 (Sphinx)
본 프로젝트의 상세 기술 문서는 GitHub Pages에서 확인하실 수 있습니다.
👉 TobaccoBug 기술 문서 보러가기
(main 브랜치에 push 시 GitHub Actions를 통해 자동 빌드 및 배포됩니다.)

💡 Lessons Learned & Challenges
이번 프로젝트는 '본전공의 도메인 지식'과 '컴퓨터공학 기술'이 만났을 때 얼마나 큰 시너지가 발생하는지 깨닫게 해준 뜻깊은 경험이었습니다.

효율성의 극대화와 사육 성공: 소프트웨어를 사육 환경에 도입하여 데이터 기록과 알림을 시스템화한 결과, 사육 관리가 획기적으로 효율화되었습니다. 데이터에 기반하여 까다로운 동족포식 문제와 먹이 비율을 적절히 제어할 수 있었고, 결과적으로 목표했던 담배장님노린재 사육을 성공적으로 완수할 수 있었습니다.

기술적 한계와 향후 과제: 하지만 그 이상의 작업으로 나아가는 데에는 현실적인 벽이 존재했습니다. 예를 들어 카메라를 이용한 '사육장 내 개체 수 자동 카운팅(Computer Vision)'이나 대규모 데이터 기반의 'AI 생육 예측 모델 도입' 같은 복잡한 작업은 개인 단위에서 구현 및 유지보수하기엔 벅찬 감이 있었습니다. 시스템 고도화를 위해서는 더 깊은 전문 지식과 팀 단위의 접근이 필요하다는 점을 배웠습니다.