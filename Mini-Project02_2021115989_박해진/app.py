from flask import Flask, Response, jsonify, request

def create_app() -> Flask:
    app = Flask(__name__)

    # 👇 브라우저에서 눈으로 확인하기 위해 추가한 '기본 대문' 👇
    @app.route("/")
    def home():
        return "🪲 노린재/가루이 위험도 평가 API 서버가 정상 작동 중입니다!"

    @app.route("/api/evaluate_risk", methods=["POST"])
    def evaluate_risk() -> tuple[Response, int] | Response:
        body: dict | None = request.get_json(silent=True)
        # ... (아래는 기존 코드와 동일) ...

        # 필드 누락 검증
        if not body or "damjang" not in body or "garui" not in body:
            return jsonify({"error": "damjang and garui fields are required"}), 400

        damjang: int = body["damjang"]
        garui: int = body["garui"]

        # 타입 및 음수 검증
        if not isinstance(damjang, int) or not isinstance(garui, int):
            return jsonify({"error": "damjang and garui must be integers"}), 400
        if damjang < 0 or garui < 0:
            return jsonify({"error": "damjang and garui must be non-negative"}), 400

        # 위험도 평가
        if garui < 1000 and damjang > 200:
            return jsonify({"status": "CRITICAL", "message": "동족포식 위험"})
        if damjang >= 1 and garui < 2000:
            return jsonify({"status": "WARNING", "message": "가루이 부족"})
        return jsonify({"status": "SAFE", "message": "안전"})

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
