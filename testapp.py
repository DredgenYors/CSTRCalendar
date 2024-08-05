from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from google_auth_oauthlib.flow import Flow, InstalledAppFlow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import os, logging, datetime, os.path
from google.auth.transport.requests import Request

# CONFIGURING OAUTH2 FLOW FOR CREDENTIALS AND AUTHORIZATION
logging.basicConfig(level=logging.DEBUG)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
app = Flask(__name__)
app.secret_key = 'your_secret_key'

CLIENT_SECRETS_FILE = "credentials.json"
SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.readonly"]
REDIRECT_URI = "http://localhost:5000/callback"

flow = Flow.from_client_secrets_file(
    CLIENT_SECRETS_FILE,
    scopes=SCOPES,
    redirect_uri=REDIRECT_URI
)

# ROUTES FOR SITE NAVIGATION
@app.route('/authorize')
def authorize():
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    logging.debug(f"Authorization URL: {authorization_url}")
    logging.debug(f"State: {state}")
    return redirect(authorization_url)

@app.route('/callback')
def callback():
    logging.debug("Callback received.")
    flow.fetch_token(authorization_response=request.url)
    if 'state' not in session or session['state'] != request.args['state']:
        logging.error("State mismatch or missing state in session.")
        return redirect(url_for('login'))
    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    logging.debug(f"Credentials stored in session: {session['credentials']}")
    return redirect(url_for('main_dashboard'))

@app.route('/')
def home():
    if 'user_logged_in' in session:
        return redirect(url_for('main_dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_logged_in' in session:
        return redirect(url_for('main_dashboard'))
    if request.method == 'POST':
        if True:
            session['user_logged_in'] = True
            return redirect(url_for('main_dashboard'))
        else:
            return render_template('login.html', error="Invalid username or password")
    return render_template('login.html')

@app.route('/dashboard')
def main_dashboard():
    if 'user_logged_in' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/logout')
def logout():
    session.pop('user_logged_in', None)
    return redirect(url_for('login'))

@app.route('/test')
def test_page():
    if 'user_logged_in' not in session:
        return redirect(url_for('login'))
    now = datetime.datetime.now()
    events = fetch_events(month=now.month, day=now.day)
    return render_template('test.html', events=events)

@app.route('/events.json')
def events_json():
    month = request.args.get('month', default=datetime.datetime.now().month, type=int)
    day = request.args.get('day', default=1, type=int)
    events = fetch_events(month=month)
    if day == 1 and 'day' not in request.args:
        first_day_events = fetch_events(month=month, day=1)
        return jsonify(first_day_events)
    else:
        filtered_events = [event for event in events if datetime.datetime.fromisoformat(event['start']).day == day]
        return jsonify(filtered_events)

@app.route('/all-monthly-events.json')
def all_monthly_events():
    month = request.args.get('month', default=datetime.datetime.now().month, type=int)
    events = fetch_events(month=month)
    return jsonify(events)

@app.route('/non-current-months-events.json')
def non_current_months_events():
    events = fetch_events(exclude_current_month=True)
    return jsonify(events)

@app.route('/next-event.json')
def next_event():
    creds = verify_credentials()
    service = build('calendar', 'v3', credentials=creds)
    now = datetime.datetime.utcnow()
    events_result = service.events().list(
        calendarId='primary',
        timeMin=now.isoformat() + 'Z',
        maxResults=1,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    events = events_result.get('items', [])
    if not events:
        return jsonify({'message': 'No upcoming events found'}), 404
    event = events[0]
    next_event_details = {
        'summary': event.get('summary'),
        'start': event['start'].get('dateTime', event['start'].get('date')),
        'end': event['end'].get('dateTime', event['end'].get('date')),
        'location': event.get('location', 'Not specified')
    }
    return jsonify(next_event_details)

# FUNCTIONS USED IN ROUTES
def verify_credentials():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=8080)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds

def fetch_events(month=None, day=None, exclude_current_month=False):
    creds = verify_credentials()
    service = build('calendar', 'v3', credentials=creds)
    now = datetime.datetime.now()
    events_list = []

    months_to_fetch = []
    if month is not None:
        if exclude_current_month:
            months_to_fetch = [m for m in range(1, 13) if m != now.month]
        else:
            months_to_fetch = [month]
    else:
        if exclude_current_month:
            months_to_fetch = [m for m in range(1, 13) if m != now.month]
        else:
            months_to_fetch = range(1, 13)

    for month_to_fetch in months_to_fetch:
        start_of_month = datetime.datetime(now.year, month_to_fetch, 1)
        if month_to_fetch == 12:
            end_of_month = datetime.datetime(now.year + 1, 1, 1) - datetime.timedelta(seconds=1)
        else:
            end_of_month = datetime.datetime(now.year, month_to_fetch + 1, 1) - datetime.timedelta(seconds=1)

        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_of_month.isoformat() + 'Z',
            timeMax=end_of_month.isoformat() + 'Z',
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])
        
        for event in events:
            start_time = datetime.datetime.fromisoformat(event['start'].get('dateTime', event['start'].get('date')).replace('Z', '+00:00'))
            end_time = datetime.datetime.fromisoformat(event['end'].get('dateTime', event['end'].get('date')).replace('Z', '+00:00'))

            if day is not None and start_time.day != day:
                continue

            events_list.append({
                'summary': event.get('summary'),
                'start': start_time.isoformat(),
                'end': end_time.isoformat()
            })

    return events_list

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
