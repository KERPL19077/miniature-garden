L1LC03 - MINIATURE GARDEN DESIGNER: RATIO AND PROPORTION

Version: 1.0.3

REFERENCE AND FILE RETENTION
This package is adapted from the latest Ratio and Proportion package, which retains the complete supplied L1LC01 Weather Station project framework. All source-framework files, including the runtime, Kit, LMS adapter, Ulipsu bridge, PDF generator, CSS, fonts, logo, manifest structure and licence files, are retained. Project-specific content, styles, manifest and project logic are adapted for this activity.

LEARNER FLOW
1. Welcome narration. The Start project action becomes available after the voice-over finishes. Narration uses the browser/device speech synthesis voice in English (India) when available.
2. Select one garden area: 1,500 m², 1,600 m² or 2,000 m².
3. Select one side ratio: 5:3 or 4:6 (length:width).
4. Listen to the area-allocation voice-over. The Next action appears after narration finishes.
5. Use the hotspot activity to place flowering plants, show plants, mini pond and pathway. Open space is reserved automatically.
6. Answer five randomly selected analysis questions, one at a time. Question 7 (doubling the garden area and whether ratios remain the same) is compulsory.
7. Collect the Garden Design Explorer badge and download the garden layout as a PNG image. Continue to the review and submit flow for the LMS result and certificate.

AREA ALLOCATION
Flowering plants: 30%; Show plants: 20%; Mini pond: 15%; Pathway: 25%; Open space: 10%. The allocations total 100%.

DIMENSION CALCULATION
The selected side ratio is treated as length:width. For total area A and ratio a:b, length = sqrt(A*a/b) and width = sqrt(A*b/a). The displayed dimensions are approximate to one decimal place; the selected total area remains exact.

ANALYSIS QUESTION BANK
Eight questions are available. Five are selected per attempt using the learner/session seed, and the mandatory doubling question is included in every set. Ratios are entered with a colon (for example, 10:3); Question 7 accepts yes/no.

REPORT
The learner can download a PNG garden layout from the badge/report page. The PNG data URL is also added to the LMS result report payload when generated. The standard runtime review, LMS submission, certificate and PDF result flow is retained.

VALIDATION NOTES
JavaScript syntax checks and archive integrity checks are performed on the package. Actual audio playback depends on browser/device speech synthesis support. Final visual rendering, PNG download behaviour and LMS submission acknowledgement must be tested in the target LMS/player before production release.

VERSION 1.0.2 FIX
The five analysis question scenes are explicitly registered in the scene sequence before the badge/report screen. This restores the missing Page 6 analysis stage.

VERSION 1.0.3 - REFRESH RESTART FIX
Every browser page load now starts a fresh learner attempt at the welcome screen. The runtime no longer restores prior localStorage or LMS suspend_data state. SCORM suspend data and progress are cleared on initialization and the new attempt is saved. This is intentional restart-on-refresh behaviour; refresh does not resume the previous attempt.
