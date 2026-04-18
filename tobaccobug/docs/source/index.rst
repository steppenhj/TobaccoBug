TobaccoBug — 사육 관리 시스템
==============================

담배장님노린재(*Nesidiocoris tenuis*) 포식자-먹이 사육을 관리하는 Flask 기반 웹 애플리케이션입니다.

.. list-table::
   :widths: 25 75

   * - **GitHub**
     - https://github.com/steppenhj/TobaccoBug
   * - **기술 문서 (이 페이지)**
     - https://steppenhj.github.io/TobaccoBug/
   * - **Swagger UI (로컬)**
     - http://localhost:5000/apidocs

----

시스템 구조
-----------

.. code-block:: text

   ┌─────────────────────────────────────────────────────┐
   │  Browser                                            │
   │  ┌─────────────┐    ES Modules                      │
   │  │  index.html │ ──► main.js                        │
   │  │             │     ├── js/state.js    (전역 상태)  │
   │  │             │     ├── js/db.js       (API 통신)  │
   │  │             │     ├── js/render.js   (DOM 렌더)  │
   │  │             │     ├── js/alerts.js   (경고 로직) │
   │  │             │     ├── js/modals.js   (모달 UI)   │
   │  │             │     └── js/helpers.js  (유틸)      │
   └──┴──────┬──────┴────────────────────────────────────┘
             │ HTTP / REST API
   ┌──────────▼──────────┐
   │  Flask (app.py)     │   Python 백엔드
   │  ├── /              │   메인 대시보드
   │  ├── /measure       │   잎 크기 측정 도구
   │  ├── /api/cages     │   케이지 CRUD
   │  └── /api/.../logs  │   로그 CRUD
   └──────────┬──────────┘
              │ sqlite3
   ┌───────────▼──────────┐
   │  tobaccobug.db       │   SQLite 로컬 파일
   │  ├── cages           │   케이지 정보 + 현재 상태(JSON)
   │  └── logs            │   케이지별 활동 기록
   └──────────────────────┘

----

REST API 엔드포인트
--------------------

.. list-table::
   :header-rows: 1
   :widths: 8 35 57

   * - #
     - 메서드 + 경로
     - 설명
   * - 1
     - ``GET  /api/cages``
     - 모든 케이지와 로그 조회
   * - 2
     - ``POST /api/cages``
     - 새 케이지 생성
   * - 3
     - ``PUT  /api/cages/<id>``
     - 케이지 상태·이름 수정
   * - 4
     - ``DELETE /api/cages/<id>``
     - 케이지 삭제 (하위 로그 포함)
   * - 5
     - ``POST /api/cages/<id>/logs``
     - 활동 로그 추가
   * - 6
     - ``DELETE /api/cages/<id>/logs/<log_id>``
     - 로그 항목 삭제

인터랙티브 테스트: ``python app.py`` 실행 후 http://localhost:5000/apidocs

----

.. toctree::
   :maxdepth: 2
   :caption: 코드 문서

   app
   migrate_from_firebase
