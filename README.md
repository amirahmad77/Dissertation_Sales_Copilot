# Sales Co-Pilot

Sales Co-Pilot is a sales operations workspace that brings together lead capture, onboarding automation, and pipeline tracking. Account teams can triage new prospects, collaborate on onboarding tasks, and monitor deal momentum without leaving the app.

## Key Capabilities

- **Lead management:** Intake forms capture contact, qualification, and compliance data with validation and progress tracking.
- **Document automation:** Supabase Edge Functions enrich uploaded documents (CR, IBAN, menu assets) with OCR and quality checks.
- **Pipeline visualization:** A kanban board highlights deal status, priorities, and value to focus attention on the next best action.
- **Activation guidance:** Stage-specific workflows and scoring keep onboarding teams aligned on what needs to happen next.

## Architecture Overview

The project is structured as a full-stack workspace combining:

- **React + Vite frontend:** UI components live in `src/` and are orchestrated through Zustand state management for lead data and onboarding stages.
- **Supabase backend:** Edge Functions in `supabase/functions/` handle document OCR, place lookups, and email notifications.
- **Machine learning scripts:** Prototypes in `ml_model/` prepare datasets and train evaluation models that inform lead scoring experiments.

## Frontend Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. (Optional) Run linting and type checks:

   ```bash
   npm run lint
   ```

4. Create a production build when ready to deploy:

   ```bash
   npm run build
   ```

## Python Environment Setup

Machine learning experiments live in `ml_model/`. Use a virtual environment and install dependencies before running the scripts:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

Run the available scripts in sequence:

```bash
python 01_generate_dataset.py
python 02_train_evaluate_model.py
```

Adjust script parameters as needed to explore different dataset sizes, feature selections, or model hyperparameters.

## Environment Configuration

The React app expects the following build-time variables:

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key |

Create a `.env.local` file in the project root and populate these values before running the development server.

## Working with Supabase Functions

Use the Supabase CLI to run the functions in `supabase/functions` locally and deploy them to your project:

```bash
supabase start
supabase functions serve
```

Review Supabase policies, authentication, and storage configuration to ensure the functions have the required access in production.
