# 🪲 TobaccoBug — 담배장님노린재 사육 관리 시스템

Flask 기반 웹 애플리케이션으로, 담배장님노린재(*Nesidiocoris tenuis*) 포식자-먹이 사육 데이터를 관리합니다.

[![GitHub Pages](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://steppenhj.github.io/TobaccoBug/)
[![Swagger UI](https://img.shields.io/badge/API-Swagger%20UI-green)](http://localhost:5000/apidocs)

---

## 주요 기능

- **케이지 대시보드** — 사육(Big), 가루이 증식(Small), 페트리 디쉬(Petri) 케이지를 한눈에 확인
- **활동 로그** — 투입·방사·밀도·메모 기록 추가/삭제
- **행동 강령 알림** — 동족포식 위험, 가루이 부족 등 자동 경고 패널
- **REST API** — Flasgger Swagger UI로 직접 테스트 가능
- **데이터 영속성** — SQLite 로컬 DB (Firebase 불필요)

---

## 빠른 시작

```bash
git clone https://github.com/steppenhj/TobaccoBug.git
cd TobaccoBug/my-flask-project
pip install -r requirements.txt
python app.py
```

브라우저에서 http://localhost:5000 접속

---

## API 문서

### Swagger UI (인터랙티브)

서버 실행 후 http://localhost:5000/apidocs

### 엔드포인트 요약

| # | 메서드 | 경로 | 설명 |
|---|--------|------|------|
| 1 | `GET` | `/api/cages` | 모든 케이지 + 로그 조회 |
| 2 | `POST` | `/api/cages` | 새 케이지 생성 |
| 3 | `PUT` | `/api/cages/<id>` | 케이지 상태·이름 수정 |
| 4 | `DELETE` | `/api/cages/<id>` | 케이지 삭제 (로그 포함) |
| 5 | `POST` | `/api/cages/<id>/logs` | 활동 로그 추가 |
| 6 | `DELETE` | `/api/cages/<id>/logs/<log_id>` | 로그 항목 삭제 |

---

## 기술 문서 (Sphinx)

**GitHub Pages:** https://steppenhj.github.io/TobaccoBug/

`main` 브랜치에 push하면 GitHub Actions가 자동으로 Sphinx 문서를 빌드하여 GitHub Pages에 배포합니다.

로컬에서 직접 빌드:
```bash
cd my-flask-project/docs
pip install sphinx sphinx-rtd-theme
make html
# docs/build/html/index.html 열기
```

---

## Firebase → Flask 마이그레이션

기존 Firebase 데이터가 있다면:

```bash
# 1. Firebase 서비스 계정 키 준비
#    Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
#    → serviceAccountKey.json 을 my-flask-project/ 폴더에 저장

# 2. 마이그레이션 실행
cd my-flask-project
python migrate_from_firebase.py
```

---

## 프로젝트 구조

```
TobaccoBug/
├── my-flask-project/          # Flask 메인 프로젝트
│   ├── app.py                 # Flask 앱 + REST API + Swagger
│   ├── migrate_from_firebase.py
│   ├── requirements.txt
│   ├── tobaccobug.db          # SQLite DB (자동 생성)
│   ├── static/
│   │   ├── main.js
│   │   ├── style.css
│   │   └── js/                # ES 모듈 (state, render, modals 등)
│   ├── templates/
│   │   ├── index.html
│   │   └── measure.html
│   └── docs/                  # Sphinx 문서
│       └── source/
├── past/                      # 이전 버전 아카이브
│   └── firebase_version/      # Firebase 기반 구버전
└── .github/workflows/
    └── docs.yml               # GitHub Actions (Sphinx → Pages 자동 배포)
```

---

## GitHub Pages 활성화 방법

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**: `GitHub Actions` 선택
3. `main` 브랜치에 push → 자동 배포

배포 URL: https://steppenhj.github.io/TobaccoBug/
