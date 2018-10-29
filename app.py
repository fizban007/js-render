from flask import Flask, send_from_directory, jsonify, request, send_file, make_response, render_template
from functools import lru_cache
import sys
import os
import base64

sys.path.append('./python/')

from gen_png import makePNG

my_port = 5050
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'public')
app = Flask(__name__, static_url_path='', template_folder='public')


@app.route('/public/<path:path>', methods=['GET'])
def serve_file_in_dir(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = os.path.join(path, 'index.html')
 
    return send_from_directory(static_file_dir, path)

@app.route('/api/img/')
def gen_image():
    arg = request.args.get('filename')
    png_bytes = makePNG(arg)
    png_bytes.seek(0)
    return send_file(png_bytes, mimetype='image/png',
                     attachment_filename='data.png')

@app.route('/render/', methods=['GET'])
def render_hdf5():
    filename = request.args.get('filename')
    return render_template('volume.html', fname=filename, port=my_port)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=my_port)
