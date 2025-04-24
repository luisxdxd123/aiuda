from flask import Flask, request, jsonify, send_file
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
import base64
import io
from gtts import gTTS
import tempfile
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

@app.route("/describe", methods=["POST"])
def describe():
    data = request.json
    image_data = base64.b64decode(data["image"].split(",")[1])
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    inputs = processor(image, return_tensors="pt")
    out = model.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)

    return jsonify({"description": caption})

@app.route("/speak", methods=["POST"])
def speak():
    data = request.json
    text = data.get("text", "")
    tts = gTTS(text, lang="es")
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tts.save(temp_file.name)
    temp_file.close()
    return send_file(temp_file.name, as_attachment=True, download_name="speech.mp3")

if __name__ == "__main__":
    app.run(debug=True)
