# F5 option 2

Proof of concept: a customer leaves a 30-second voice message instead of waiting for a KBC-style phone agent. The recording is transcribed, a CRM case is opened, and the app proposes a resolution for a **blocked account**.

This is a demo. It is not the real KBC app and it is not connected to KBC systems.

## Flow

1. Open the phone UI. Annelies Peeters sees her zichtrekening and a blocked debit card.
2. Tap **Voice message** and record up to 30 seconds (Chrome or Edge). Or use the blocked-account script if the mic is unavailable.
3. The transcript is shown, then `POST /api/case` writes a CRM case.
4. For a blocked card the app proposes: confirm the PIN attempts and unblock, or keep the block and order a new card.
5. **CRM desk** shows the backend record the agent or the next automation would pick up.

## Scenario

Debit card ••4419 blocked after 3 incorrect PIN attempts at a Bancontact ATM in Berchem. The account stays open. Standing orders are unaffected.

Try saying: “My account is blocked. The debit card was declined. I think I entered the wrong PIN at the ATM. Please unblock it.”

Dutch keywords such as `geblokkeerd`, `kaart`, and `rekening` are recognised too.
