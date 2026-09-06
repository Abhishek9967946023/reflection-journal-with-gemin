# Reflection Journal with Gemini & Cloud Firestore

A private, user-authenticated reflection and journaling web application powered by Google Gemini 3.6 Flash and Cloud Firestore with Google Authentication.

---

## 1. Environment & Prerequisites

Ensure you have the Google Cloud SDK (`gcloud`) and Firebase CLI installed and authenticated:

```bash
# Log in to Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  generativelanguage.googleapis.com
```

---

## 2. Secret Management Setup (Zero-Hardcoding Standards)

Store the Gemini API Key in Google Cloud Secret Manager and grant access to the Cloud Run runtime service account:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Identify your Cloud Project Number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# 3. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy the user-isolated security rules to ensure no user can read or modify another user's journal entries or interactions:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default-deny all unmapped paths
    match /{document=**} {
      allow read, write: if false;
    }

    // User Data Isolation: Restricted strictly to the authenticated owner
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Deploy the full-stack container application to Cloud Run with Secret Manager environment variable binding:

```bash
gcloud run deploy reflection-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"
```

---

## 5. Required Campaign Labeling (Verification Binding)

Apply the mandatory resource label to register the service for automated challenge verification:

```bash
gcloud run services update reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Stability & User Walkthroughs (Test Scenarios)

The following structured test scenarios cover every user-visible interaction:

### Scenario 1: Authentication & Landing View
1. **Initial Visit**: Navigate to the root URL. Verify the landing screen renders with application description, security badges, and the **Continue with Google** button.
2. **Google Sign-In Trigger**: Click the **Continue with Google** button (`#google-signin-hero-btn`). Verify that the Google OAuth popup opens.
3. **Session Establishment**: Select a Google account. Verify that the UI transitions from `LandingPage` to the authenticated dashboard without refreshing the page.
4. **User Profile Rendering**: Verify the top navigation bar displays the user's avatar, display name, and email address.

### Scenario 2: Creating a Reflection & Conversing with Gemini
1. **Draft Initial Entry**: In the title field (`#reflection-title-input`), enter `"Reflections on Career Growth"`. In the main reflection area (`#journal-content-textarea`), type `"I feel uncertain about taking on a team leadership role."`.
2. **Explore Modes**: Click each mode tab (`#mode-reflect-btn`, `#mode-brainstorm-btn`, `#mode-summary-btn`, `#mode-action-btn`). Verify the active highlight moves and the corresponding prompt suggestions update.
3. **Send Reflection to Gemini**: Click a quick suggestion chip or type a question into the conversation input (`#reflection-prompt-input`) and click **Send** (`#send-prompt-btn`).
4. **Generation & Fallback Protocol**: Verify the generation loading spinner appears. Confirm that Gemini 3.6 Flash responds with Markdown formatting and a speaker badge.
5. **Multi-Turn Interaction**: Type a follow-up response (`"What are 2 low-risk ways I can test leadership?"`) and press Enter. Verify the new user turn and Gemini turn append chronologically to the conversation thread.

### Scenario 3: AI Summarization & Tagging
1. **Trigger Auto-Summarize**: Click the **Summarize & Tag** button (`#auto-summarize-btn`).
2. **Review Output**: Verify the AI summary box appears with an italicized summary and generated tag pills (e.g., `#leadership`, `#career`).
3. **Custom Tag Addition**: Type a tag into the `+ tag` input and press Enter. Confirm the new pill is added.

### Scenario 4: Cloud Firestore Persistence & Verification
1. **Save Entry**: Click **Save Changes** (`#save-reflection-btn`).
2. **Verification State**: Confirm the button state transitions to `"Saving..."` and then to `"Saved to Cloud"` with a green checkmark.
3. **Zero-Crash Payload Check**: Verify that empty or undefined fields do not crash the Firestore write.
4. **Inspect History**: Verify the reflection appears in the left history sidebar with the updated timestamp and turn count.

### Scenario 5: History Navigation & Search
1. **Start Fresh Draft**: Click the **New Reflection** button (`#nav-new-reflection-btn`). Verify the editor clears.
2. **Load Past Entry**: Click on a previous entry in the history sidebar (`#history-entry-{id}`). Verify the title, reflection text, conversation turns, and tags are fully restored.
3. **Search Filtering**: Type a keyword in the sidebar search input (`#history-search-input`). Verify that non-matching reflections are filtered out in real-time.
4. **Delete Entry**: Hover over an entry card in the sidebar and click the trash icon. Confirm the confirmation prompt and verify the entry is deleted from Firestore and removed from the list.

### Scenario 6: Security Modal & Sign Out
1. **Inspect Security Model**: Click **Security Specs** (`#nav-security-btn`). Verify the active Firestore rules and Gemini fallback architecture are displayed. Click **Acknowledge & Close**.
2. **Sign Out**: Click the **Sign Out** button (`#nav-logout-btn`). Verify the user session terminates and the view returns to the landing page.
