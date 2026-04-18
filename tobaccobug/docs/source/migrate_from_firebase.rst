migrate\_from\_firebase module
==============================

.. note::

   이 스크립트는 **이미 완료된 일회성 마이그레이션 도구** 입니다.

   초기 개발 단계에서 Firebase Firestore를 백엔드로 사용하다가,
   과제 요건(Sphinx 문서화, 순수 Python 서버)을 충족하기 위해
   Flask + SQLite 구조로 전환하면서 기존 데이터를 옮기는 데 사용했습니다.

   현재 앱은 SQLite(``tobaccobug.db``)만 사용하므로 이 스크립트를 다시
   실행할 필요가 없습니다. 재실행이 필요한 경우에만 ``firebase-admin``
   패키지를 설치하고, ``serviceAccountKey.json``을 준비하세요.
   (``serviceAccountKey.json.example`` 참고)

.. automodule:: migrate_from_firebase
   :members:
   :show-inheritance:
   :undoc-members:
