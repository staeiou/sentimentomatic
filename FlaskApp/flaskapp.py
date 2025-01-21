from googleapiclient import discovery
import numpy as np
import os
from flask import Flask, request, render_template
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import pandas as pd
from html_sanitizer import Sanitizer
from flask_recaptcha import ReCaptcha
from textblob import TextBlob
import time
from sentimental import Sentimental
import json
pd.set_option('display.max_colwidth', None)


app = Flask(__name__)

app.config.update(
    RECAPTCHA_SITE_KEY="",
    RECAPTCHA_SECRET_KEY=""
)

G_API_KEY = ''


app.config['MAX_CONTENT_LENGTH'] = 1024 * 256

recaptcha = ReCaptcha(app=app)

@app.route('/')
def my_form():
    return render_template('form.html')

@app.route('/', methods=['POST'])
def my_form_post():
    text = request.form['text1']

    if recaptcha.verify() and len(text.splitlines())<52 and len(text) < 125000:
        # SUCCESS
        #time.sleep(3)
        results_list = []

        sa = SentimentIntensityAnalyzer()


        sanitizer = Sanitizer({"tags": { "a","hr","br","b","li","p"},    "keep_typographic_whitespace": True,    "whitespace": {}})

        client = discovery.build(
            "commentanalyzer",
            "v1alpha1",
            developerKey=G_API_KEY,
            discoveryServiceUrl="https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1",
            static_discovery=False,)

        for row in text.splitlines():
            safe_row = sanitizer.sanitize(row)
            sa_result = sa.polarity_scores(text=safe_row)
            result = {}
            result['text'] = safe_row

            result['VADER: -1.0 (negative emotion) to +1.0 (positive emotion)'] = round(sa_result['compound'],3)

            result['textblob polarity: -1.0 (negative) to +1.0 (positive)'] = round(TextBlob(safe_row).polarity,3)
            result['textblob objective: 0.0 (objective) to +1.0 (subjective)'] = round(TextBlob(safe_row).subjectivity,3)

            analyze_request = {
                'comment': { 'text': safe_row },
                'languages': ['en'],
                'requestedAttributes': {'TOXICITY': {}}
            }
            if(request.form.get("papi")):
                papi = True
            else:
                papi = False

            if papi:
                try:
                    if(len(safe_row)>2900): raise Exception("Line too long (max 2500 characters)")
                    response = client.comments().analyze(body=analyze_request).execute()
                    perspective_result = response['attributeScores']['TOXICITY']['spanScores'][0]['score']['value']
                    result['perspective: 0.0 (not toxic) to +1.0 (toxic)'] = round(perspective_result,3)

                except Exception as e:
                    perspective_result = "ERROR: " + str(e)
                    result['perspective: 0.0 (not toxic) to +1.0 (toxic)'] = perspective_result

            results_list.append(result)

        results_df = pd.DataFrame.from_records(results_list)
        results_df.index = np.arange(1, len(results_df) + 1)
        html_results = results_df.to_html(classes="cell-border compact hover order-column stripe")

        return render_template('form.html', final=html_results, text1=text)

    else:
        # FAILED
        if len(text.splitlines())>51:
            return render_template('form.html', final="<h1>"+str(len(text.splitlines()))+" lines. Please submit 50 or fewer lines of text.</h1>", text1="")
        elif len(text)>125000:
            return render_template('form.html', final="<h1>"+str(len(text))+" total characters. Max total characters allowed is 125,00 (average of 2,500 per line)</h1>", text1="")
        else:
            return render_template('form.html', final="<h1>Please complete the recaptcha test.</h1>", text1="")

if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5002, threaded=True)
