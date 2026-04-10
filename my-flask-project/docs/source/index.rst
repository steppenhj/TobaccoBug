TobaccoBug — 사육 관리 시스템
==============================

담배장님노린재(*Nesidiocoris tenuis*) 포식자-먹이 사육을 관리하는 Flask 기반 웹 애플리케이션입니다.

.. list-table::
   :widths: 30 70

   * - **GitHub**
     - https://github.com/steppenhj/TobaccoBug
   * - **GitHub Pages (이 문서)**
     - https://steppenhj.github.io/TobaccoBug/
   * - **Swagger UI (로컬)**
     - http://localhost:5000/apidocs

개요
----

- **사육 케이지 관리**: Big(B), Small(S), Petri(P) 타입 케이지 CRUD
- **활동 로그**: 투입·방사·밀도·메모 기록 추가/삭제
- **행동 강령 알림**: 동족포식 위험, 가루이 부족 등 자동 경고
- **데이터 저장**: Firebase 없이 SQLite로 로컬 관리

API 엔드포인트 요약
--------------------

.. list-table::
   :header-rows: 1
   :widths: 10 35 55

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
     - 케이지 삭제 (로그 포함)
   * - 5
     - ``POST /api/cages/<id>/logs``
     - 활동 로그 추가
   * - 6
     - ``DELETE /api/cages/<id>/logs/<log_id>``
     - 로그 항목 삭제

.. toctree::
   :maxdepth: 2
   :caption: 코드 문서

   app
   migrate_from_firebase
