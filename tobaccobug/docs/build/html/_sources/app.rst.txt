Flask 애플리케이션 (app.py)
============================

TobaccoBug의 Flask 백엔드입니다.
SQLite DB 연결 관리, REST API 엔드포인트 6개, Swagger UI 설정이 한 파일에 정의됩니다.

.. note::
   라우트 함수(``get_cages``, ``create_cage`` 등)는 Swagger UI 전용 YAML 포맷
   docstring을 사용하므로 이 문서에서는 제외합니다.
   API 명세는 :doc:`index` 의 엔드포인트 표 또는 ``/apidocs`` 에서 확인하세요.

----

모듈 개요
----------

.. automodule:: app
   :no-members:

----

DB 연결
--------

.. autofunction:: app.get_db
.. autofunction:: app.close_connection

----

초기화
------

.. autofunction:: app.init_db

----

변환 헬퍼
----------

.. autofunction:: app.cage_row_to_dict
.. autofunction:: app.log_row_to_dict
