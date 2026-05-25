================================================================
CLOSET MINGLE — SETUP GUIDE
Written for Alexandria on a Windows computer
================================================================

BEFORE YOU START — READ THIS FIRST
================================================================

Your computer situation:
- You have Windows
- You already have Python installed (that is why Jupyter works)
- You open things by typing in a black window called Command Prompt

WHAT IS COMMAND PROMPT?
It is the black window where you type things.
To open it:
  1. Press the Windows key on your keyboard (bottom left, looks like a flag)
  2. Type the word:  cmd
  3. Press Enter
  4. A black window opens with white text
  5. That black window is Command Prompt

You will use Command Prompt many times in this guide.
Every time this guide says "open Command Prompt" do those 4 steps above.

================================================================
WHAT ARE WE BUILDING AND WHY DO WE NEED THESE TOOLS?
================================================================

Your Closet Mingle app needs 5 outside services to work.
Here is what each one does in plain English:

  NODEJS ......... Makes your app able to run on your computer
                   Think of it like a translator between your
                   code and your computer. Without it nothing runs.

  FIREBASE ....... Stores everything your app needs to remember
                   User accounts, passwords, photos, messages,
                   saved outfits. It lives on Google's servers.
                   It is FREE.

  STRIPE ......... Takes money from your users
                   When someone pays $9.99 a month, Stripe
                   handles that transaction safely.
                   FREE to set up. They take 2.9% per payment.

  GITHUB ......... Saves your code safely on the internet
                   Think of it like Google Drive but for code.
                   Vercel reads your code from here.
                   It is FREE.

  VERCEL ......... Puts your app on the internet
                   It reads your code from GitHub and turns it
                   into a real website with a link you can share.
                   It is FREE.

YOU WILL DO THINGS IN THIS ORDER:
  Step 1 ....... Unzip and check your files
  Step 2 ....... Install Node.js
  Step 3 ....... Install VS Code
  Step 4 ....... Install Git
  Step 5 ....... Set up Firebase
  Step 6 ....... Set up Stripe
  Step 7 ....... Create your secret keys file
  Step 8 ....... Set up GitHub and upload your code
  Step 9 ....... Set up Vercel and go live
  Step 10 ...... Add the app to your phone

Total time: About 90 minutes if you go step by step.
Do not skip around. Do each step in order.

================================================================
STEP 1 — UNZIP YOUR FILES AND CHECK THEM
================================================================

You downloaded a file called:
  ClosetMingle_v2_FINAL.zip

It is probably in your Downloads folder right now.

--- UNZIP IT ---

1. Press the Windows key
2. Type: File Explorer
3. Press Enter
4. On the left side click "Downloads"
5. Find the file: ClosetMingle_v2_FINAL.zip
6. RIGHT-CLICK on that file
7. A menu pops up. Click "Extract All..."
8. A box appears asking WHERE to put the files
9. Click the "Browse" button
10. On the left side of the Browse window click "Desktop"
11. Click "Select Folder"
12. Click "Extract"
13. Wait a few seconds
14. A folder called "closet-mingle" appears on your Desktop

--- CHECK THAT YOUR FILES ARE CORRECT ---

Do this now. Do not skip this.

1. Double-click the "closet-mingle" folder on your Desktop to open it
2. You should see these items INSIDE that folder:

    SETUP_GUIDE.md     ← a file (this guide)
    package.json       ← a file
    vercel.json        ← a file
    .env.example       ← a file (might be invisible — see note below)
    public             ← a FOLDER (has a little folder icon)
    src                ← a FOLDER (has a little folder icon)

HOW TO SEE HIDDEN FILES (you need this for .env.example):
  1. In File Explorer, click "View" in the top menu bar
  2. Click "Show"
  3. Click "Hidden items"
  4. Now .env.example should be visible

3. Double-click the "public" folder to open it
   You should see these 4 files inside:
     index.html
     manifest.json
     sw.js
     robots.txt
   Click the Back arrow to go back to closet-mingle

4. Double-click the "src" folder to open it
   You should see:
     App.js             ← a file
     index.js           ← a file
     components         ← a FOLDER
     lib                ← a FOLDER
     pages              ← a FOLDER
     styles             ← a FOLDER

5. Double-click the "components" folder
   You should see these 3 files:
     CameraModal.js
     TabBar.js
     Toast.js
   Click Back

6. Double-click the "lib" folder
   You should see these 3 files:
     AuthContext.js
     firebase.js
     stripe.js
   Click Back

7. Double-click the "pages" folder
   You should see these 12 files:
     Account.js
     Chat.js
     ClientHome.js
     Closet.js
     Login.js
     Plans.js
     Signup.js
     StylistChat.js
     StylistHome.js
     StylistList.js
     SwipeOutfits.js
     Welcome.js
   Click Back

8. Double-click the "styles" folder
   You should see this 1 file:
     global.css
   Click Back

IF ANY FILE IS MISSING: Stop and tell Claude which file is missing.
IF ALL FILES ARE THERE: Great! Move to Step 2.

Here is the complete picture of every file and where it lives:

Desktop
└── closet-mingle
    ├── SETUP_GUIDE.md
    ├── package.json
    ├── vercel.json
    ├── .env.example
    ├── public
    │   ├── index.html
    │   ├── manifest.json
    │   ├── sw.js
    │   └── robots.txt
    └── src
        ├── App.js
        ├── index.js
        ├── components
        │   ├── CameraModal.js
        │   ├── TabBar.js
        │   └── Toast.js
        ├── lib
        │   ├── AuthContext.js
        │   ├── firebase.js
        │   └── stripe.js
        ├── pages
        │   ├── Account.js
        │   ├── Chat.js
        │   ├── ClientHome.js
        │   ├── Closet.js
        │   ├── Login.js
        │   ├── Plans.js
        │   ├── Signup.js
        │   ├── StylistChat.js
        │   ├── StylistHome.js
        │   ├── StylistList.js
        │   ├── SwipeOutfits.js
        │   └── Welcome.js
        └── styles
            └── global.css

TOTAL: 29 files. That is all of them.
YOU DO NOT CREATE OR MOVE ANY OF THESE FILES.
They already exist in the right places.
You only need to do Step 7 where you EDIT one file.

================================================================
STEP 2 — INSTALL NODE.JS
================================================================

Node.js is what makes your app run.
You only install this ONCE on your computer. Ever.

CHECK IF YOU ALREADY HAVE IT FIRST:
  1. Open Command Prompt
  2. Type this exactly:   node --version
  3. Press Enter
  4. If you see something like   v20.11.0   then it is installed.
     SKIP to Step 3.
  5. If you see   'node' is not recognized   then install it now:

INSTALLING NODE.JS (only do this if you do not have it):
  1. Open your web browser
  2. Go to:   https://nodejs.org
  3. You see TWO big buttons
  4. Click the LEFT button that says "LTS"
     LTS means it is the stable safe version
  5. A file downloads to your Downloads folder
     It is named something like:   node-v20.11.0-x64.msi
  6. Open your Downloads folder
  7. Double-click that file
  8. Windows asks "Do you want to allow this app to make changes?"
     Click YES
  9. The Node.js Setup window opens
 10. Click Next
 11. Check the box "I accept the terms" then click Next
 12. It asks where to install — do not change anything, click Next
 13. It shows "Custom Setup" — do not change anything, click Next
 14. It asks about "Tools for Native Modules"
     Do NOT check that box. Click Next.
 15. Click Install
 16. Wait about 2 minutes
 17. Click Finish

NOW CHECK IT WORKED:
  1. CLOSE Command Prompt completely (click the X)
  2. Open it AGAIN (Windows key, type cmd, Enter)
     You MUST close and reopen it or it will not find Node.js
  3. Type:   node --version
  4. Press Enter
  5. You should see:   v20.11.0   (or similar number)
  6. Type:   npm --version
  7. Press Enter
  8. You should see:   10.2.4   (or similar number)

If you see both version numbers: Node.js is installed correctly ✅
If you see "not recognized": Close and reopen Command Prompt and try again

================================================================
STEP 3 — INSTALL VS CODE
================================================================

VS Code is a text editor made for code.
You will use it to edit one file in Step 7.
You only install this ONCE. Ever.

  1. Open your web browser
  2. Go to:   https://code.visualstudio.com
  3. You see a big blue download button
  4. Click it. A file downloads.
     It is named something like:   VSCodeUserSetup-x64-1.85.exe
  5. Go to your Downloads folder
  6. Double-click that file
  7. Windows asks permission — click YES
  8. "I accept the agreement" — click that then click Next
  9. It asks where to install — do not change it, click Next
 10. It asks about a Start Menu folder — click Next
 11. You see "Select Additional Tasks"
     CHECK ALL OF THESE BOXES:
       ✅ Add "Open with Code" action to Windows Explorer file context menu
       ✅ Add "Open with Code" action to Windows Explorer directory context menu
       ✅ Register Code as an editor for supported file types
       ✅ Add to PATH
 12. Click Next
 13. Click Install
 14. Wait about 1 minute
 15. Uncheck "Launch Visual Studio Code"
 16. Click Finish

VS Code is installed ✅
You do not need to open it right now.

================================================================
STEP 4 — INSTALL GIT
================================================================

Git is the tool that sends your code from your computer to GitHub.
You only install this ONCE. Ever.

CHECK IF YOU ALREADY HAVE IT FIRST:
  1. Open Command Prompt
  2. Type:   git --version
  3. Press Enter
  4. If you see something like   git version 2.43.0   it is installed.
     SKIP to Step 5.
  5. If you see "not recognized" then install it:

INSTALLING GIT:
  1. Open your web browser
  2. Go to:   https://git-scm.com/download/win
  3. The download starts automatically
     The file is named something like:   Git-2.43.0-64-bit.exe
  4. Go to your Downloads folder
  5. Double-click that file
  6. Windows asks permission — click YES
  7. You see the license — click Next
  8. It asks where to install — do not change it, click Next
  9. It asks about components — do not change anything, click Next
 10. It asks about the Start Menu folder — click Next
 11. It asks "default editor" — change it to "Use Visual Studio Code"
     (Click the dropdown, find Visual Studio Code, select it)
 12. Click Next on all remaining screens without changing anything
     There are about 8 more screens — just keep clicking Next
 13. Click Install
 14. Wait about 1 minute
 15. Uncheck "Launch Git Bash"
 16. Click Finish

NOW CHECK IT WORKED:
  1. Close Command Prompt and reopen it
  2. Type:   git --version
  3. Press Enter
  4. You should see:   git version 2.43.0

Git is installed ✅

================================================================
STEP 5 — SET UP FIREBASE
================================================================

Firebase is Google's free service that stores all your app data.
You do ALL of these sub-steps ONE TIME each.
You will need to be logged into your Google account.

If you do not have a Google / Gmail account:
  Go to gmail.com and create one first before continuing.

--- 5A. CREATE YOUR FIREBASE ACCOUNT ---
(Do this 1 time)

  1. Open your web browser
  2. Go to:   https://console.firebase.google.com
  3. Sign in with your Google account
  4. You are now on the Firebase home page ✅

--- 5B. CREATE A PROJECT ---
(Do this 1 time)

  1. Click the card that says "+ Add project"
  2. In the box that says "Enter your project name" type:
       closet-mingle
  3. Click Continue
  4. You see a page about Google Analytics
     Click the blue toggle to turn it OFF (it should turn grey)
  5. Click "Create project"
  6. A circle spins for about 30 seconds
  7. When it says "Your new project is ready" click Continue
  8. You are now inside your Firebase project

You will see a SIDEBAR on the LEFT side of the screen.
It has icons and words like Build, Authentication, etc.
You will use this sidebar a lot in the next steps.

--- 5C. TURN ON EMAIL LOGIN ---
(Do this 1 time)

This lets people sign up and log into your app with email and password.

  1. In the LEFT SIDEBAR look for "Authentication"
     It has an icon that looks like a person
  2. Click "Authentication"
  3. A white button says "Get started" — click it
  4. You see a page with a heading "Sign-in providers"
  5. You see a list. Find "Email/Password" and click on it
  6. A panel slides out from the right
  7. At the top of that panel you see "Email/Password" with a toggle switch
     The toggle looks like a small oval
     Click it so it turns BLUE
  8. Below that is another toggle called "Email link" — leave that one OFF
  9. Click the blue "Save" button
 10. You should see "Email/Password" with a green badge that says "Enabled"

Email login is turned on ✅

--- 5D. CREATE THE DATABASE ---
(Do this 1 time)

This database stores users, outfits, messages, and more.

  1. In the LEFT SIDEBAR look for "Firestore Database"
     It might just show as "Firestore"
  2. Click it
  3. A white button says "Create database" — click it
  4. A popup window appears with two choices
     Click the circle next to "Start in test mode"
  5. Click Next
  6. It shows a dropdown labeled "Cloud Firestore location"
     Click the dropdown and select:   nam5 (us-central)
  7. Click Enable
  8. Wait about 60 seconds while it sets up
  9. You see an empty table with columns — that means it worked ✅

NOW ADD SECURITY RULES TO THE DATABASE:
(Do this 1 time, right now, immediately after step 9 above)

  1. Near the top of the page you see tabs:
     Data    Rules    Indexes    Usage
  2. Click "Rules"
  3. You see a box with some text already in it
  4. Click inside that text box
  5. Press Ctrl + A (this selects ALL the text)
  6. Press Delete (this deletes all of it)
  7. The box should now be completely empty
  8. Now carefully type OR copy-paste the following text.
     Copy everything between the two lines of dashes.
     Do not copy the dashes themselves.

- - - - - - COPY FROM BELOW THIS LINE - - - - - -
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /closetItems/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /messages/{msgId} {
      allow read, write: if request.auth != null;
    }
    match /savedOutfits/{outfitId} {
      allow read, write: if request.auth != null;
    }
  }
}
- - - - - - COPY UP TO ABOVE THIS LINE - - - - - -

  9. Paste it into the empty rules box
 10. Click the "Publish" button
 11. A small popup may appear — click Publish again to confirm

Database rules are saved ✅

--- 5E. TURN ON PHOTO STORAGE ---
(Do this 1 time)

This lets users upload photos of their clothes.

  1. In the LEFT SIDEBAR look for "Storage"
     It has an icon that looks like a bucket or cylinder
  2. Click "Storage"
  3. A white button says "Get started" — click it
  4. A popup appears with two choices
     Click the circle next to "Start in test mode"
  5. Click Next
  6. It shows a storage location — leave it exactly as it is
  7. Click Done
  8. Wait about 30 seconds
  9. You see a file manager type screen — that means it worked ✅

NOW ADD SECURITY RULES TO STORAGE:
(Do this 1 time, right now, immediately after step 9 above)

  1. Near the top of the page you see tabs:
     Files    Rules    Usage
  2. Click "Rules"
  3. You see a box with some text already in it
  4. Click inside that text box
  5. Press Ctrl + A to select all
  6. Press Delete to delete all
  7. The box should now be completely empty
  8. Copy and paste EXACTLY this:

- - - - - - COPY FROM BELOW THIS LINE - - - - - -
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
- - - - - - COPY UP TO ABOVE THIS LINE - - - - - -

  9. Click Publish

Storage rules are saved ✅

--- 5F. GET YOUR FIREBASE SECRET KEYS ---
(Do this 1 time)

These are codes that tell your app which Firebase project to connect to.

  1. Look at the very top of the LEFT SIDEBAR
     You see a gear icon ⚙️ next to the words "Project Overview"
  2. Click that gear icon ⚙️
  3. Click "Project settings"
  4. You land on a page called "General"
  5. Scroll DOWN the page
  6. You will reach a section called "Your apps"
     If you do not see it keep scrolling — it is near the bottom
  7. You see some icons for different types of apps
     Look for an icon that looks like this:  </>
     (It represents a website / web app)
  8. Click the </> icon
  9. A box appears asking "App nickname"
     Type:   closet-mingle-web
 10. The checkbox "Also set up Firebase Hosting" — leave it UNCHECKED
 11. Click "Register app"
 12. You see a block of code on the screen
     It looks exactly like this (with your real values instead of X's):

     const firebaseConfig = {
       apiKey: "AIzaSyXXXXXXXXXXXXXXX",
       authDomain: "closet-mingle.firebaseapp.com",
       projectId: "closet-mingle",
       storageBucket: "closet-mingle.appspot.com",
       messagingSenderId: "123456789012",
       appId: "1:123456789012:web:abcdef1234567890"
     };

 13. DO NOT CLOSE THIS SCREEN
 14. Open Notepad:
       Press Windows key
       Type: notepad
       Press Enter
 15. In Notepad, write down your 6 values like this.
     Replace the example values with YOUR real values from the screen:

       FIREBASE_API_KEY = AIzaSyXXXXXXXXXXXXXXX
       FIREBASE_AUTH_DOMAIN = closet-mingle.firebaseapp.com
       FIREBASE_PROJECT_ID = closet-mingle
       FIREBASE_STORAGE_BUCKET = closet-mingle.appspot.com
       FIREBASE_MESSAGING_SENDER_ID = 123456789012
       FIREBASE_APP_ID = 1:123456789012:web:abcdef1234567890

 16. In Notepad click File → Save As
 17. Save it to your Desktop
 18. Name it:   my-keys.txt
 19. Click Save
 20. Go back to the browser and click "Continue to console"

Your Firebase keys are saved in my-keys.txt on your Desktop ✅

================================================================
STEP 6 — SET UP STRIPE
================================================================

Stripe handles payments.
You do all of these sub-steps ONE TIME each.

--- 6A. CREATE A STRIPE ACCOUNT ---
(Do this 1 time)

  1. Go to:   https://dashboard.stripe.com/register
  2. Fill in your email, full name, country (United States), password
  3. Click "Create account"
  4. Go to your email inbox
  5. Find an email from Stripe with subject "Verify your email"
  6. Click the link in that email
  7. You are now logged into Stripe ✅

--- 6B. CREATE THE MONTHLY SUBSCRIPTION PRODUCT ---
(Do this 1 time)

  1. You are on the Stripe dashboard
  2. On the LEFT SIDEBAR click "Product catalog"
  3. In the top right area click "+ Create product"
  4. Fill in these fields:
       Name:          Premium Monthly
       Description:   Unlimited access to live stylists
  5. You see a section called "Pricing"
  6. In the price field type:   9.99
  7. The currency should say USD — leave it as USD
  8. For "Billing period" click "Recurring"
  9. A dropdown appears — select "Monthly"
 10. Click "Save product"
 11. You land on the product detail page
 12. Scroll down to find the "Pricing" section
 13. You see a line with a price ID — it starts with "price_"
     It looks like:   price_1OABCdEFGhiJKLm
 14. Click the copy icon next to it OR highlight it and press Ctrl+C
 15. Switch to Notepad (my-keys.txt on your Desktop)
 16. Add a new line:
       STRIPE_MONTHLY_PRICE_ID = price_1OABCdEFGhiJKLm
     (Use your real price ID, not this example)
 17. Save the file (Ctrl+S)

--- 6C. CREATE THE ONE-TIME SESSION PRODUCT ---
(Do this 1 time)

  1. In Stripe click the back arrow to go back to the product list
  2. Click "+ Create product" again
  3. Fill in:
       Name:          Stylist Session
       Description:   One live styling session with a personal stylist
  4. In the price field type:   4.99
  5. Currency: USD
  6. For "Billing period" make sure "One time" is selected
  7. Click "Save product"
  8. On the product page, find and copy the price ID
  9. Add it to your Notepad file:
       STRIPE_SESSION_PRICE_ID = price_1OXYZabc123456
 10. Save the file (Ctrl+S)

--- 6D. GET YOUR STRIPE PUBLISHABLE KEY ---
(Do this 1 time)

  1. On the LEFT SIDEBAR in Stripe click "Developers"
  2. Click "API keys"
  3. You see two keys:
       Publishable key — starts with   pk_test_
       Secret key — starts with   sk_test_
  4. ONLY copy the Publishable key (pk_test_...)
     DO NOT share the Secret key with anyone ever
  5. Click the copy button next to the Publishable key
  6. Add it to your Notepad file:
       STRIPE_PUBLISHABLE_KEY = pk_test_51XXXXXXXXXXXXXXX
  7. Save the file (Ctrl+S)

Your Notepad file (my-keys.txt) should now have 9 lines total:
  FIREBASE_API_KEY = ...
  FIREBASE_AUTH_DOMAIN = ...
  FIREBASE_PROJECT_ID = ...
  FIREBASE_STORAGE_BUCKET = ...
  FIREBASE_MESSAGING_SENDER_ID = ...
  FIREBASE_APP_ID = ...
  STRIPE_MONTHLY_PRICE_ID = ...
  STRIPE_SESSION_PRICE_ID = ...
  STRIPE_PUBLISHABLE_KEY = ...

If any of those 9 lines are missing, go back and get the missing value.

================================================================
STEP 7 — CREATE YOUR SECRET KEYS FILE
================================================================

Now you take your keys from my-keys.txt and put them
into the app so it knows which Firebase and Stripe to connect to.

You will edit 2 files in this step.

--- 7A. CREATE THE .env.local FILE ---
(Do this 1 time)

  1. Go to your Desktop
  2. Open the closet-mingle folder
  3. You should see a file called   .env.example
     (If you cannot see it, go to File Explorer → View → Show → Hidden items)
  4. RIGHT-CLICK on   .env.example
  5. Click "Copy"
  6. RIGHT-CLICK on any empty white space inside the folder
  7. Click "Paste"
  8. A new file appears called   .env.example - Copy
  9. RIGHT-CLICK on   .env.example - Copy
 10. Click "Rename"
 11. The name becomes highlighted and editable
 12. Delete everything in the name field
 13. Type EXACTLY this (with the dot at the beginning):
       .env.local
 14. Press Enter
 15. Windows may warn you: "If you change a file name extension, 
     the file might become unusable"
     Click "Yes"
 16. The file is now called   .env.local

--- 7B. FILL IN .env.local WITH YOUR FIREBASE AND STRIPE KEYS ---
(Do this 1 time)

  1. RIGHT-CLICK on the   .env.local   file
  2. Click "Open with"
  3. If you see "Notepad" click it
     If you do not see Notepad click "Choose another app"
     then find and click Notepad
  4. The file opens. It has lines like:
       REACT_APP_FIREBASE_API_KEY=your_api_key_here
  5. You need to replace the placeholder text after each = sign
     with your REAL values from my-keys.txt

  Here is what each line should look like BEFORE (what you see now)
  and AFTER (what you change it to):

  BEFORE: REACT_APP_FIREBASE_API_KEY=your_api_key_here
  AFTER:  REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXX
  (use your real API key from my-keys.txt)

  BEFORE: REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
  AFTER:  REACT_APP_FIREBASE_AUTH_DOMAIN=closet-mingle.firebaseapp.com

  BEFORE: REACT_APP_FIREBASE_PROJECT_ID=your_project_id
  AFTER:  REACT_APP_FIREBASE_PROJECT_ID=closet-mingle

  BEFORE: REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
  AFTER:  REACT_APP_FIREBASE_STORAGE_BUCKET=closet-mingle.appspot.com

  BEFORE: REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  AFTER:  REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
  (use your real number)

  BEFORE: REACT_APP_FIREBASE_APP_ID=your_app_id
  AFTER:  REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123
  (use your real app ID)

  BEFORE: REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
  AFTER:  REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXXXX
  (use your real Stripe key)

  IMPORTANT RULES:
  → No spaces before or after the = sign
  → No quote marks around the values
  → Each line must stay on its own line
  → Do not add any extra blank lines
  → Do not change the REACT_APP_ part at the beginning

  6. When all 7 lines have your real values, click File → Save
  7. Close Notepad

--- 7C. UPDATE THE STRIPE PRICE IDs IN stripe.js ---
(Do this 1 time)

  1. Still inside the closet-mingle folder on your Desktop
  2. Open the "src" folder
  3. Open the "lib" folder
  4. You see a file called   stripe.js
  5. RIGHT-CLICK on   stripe.js
  6. Click "Open with" → Notepad
  7. You see this text:
       premium_monthly: "price_YOUR_MONTHLY_PRICE_ID",
       pay_per_session: "price_YOUR_SESSION_PRICE_ID",
  8. Replace   price_YOUR_MONTHLY_PRICE_ID   with your real monthly price ID
     from my-keys.txt
  9. Replace   price_YOUR_SESSION_PRICE_ID   with your real session price ID
     from my-keys.txt
 10. Click File → Save
 11. Close Notepad

Those are the only 2 files you need to edit.
You NEVER edit any other file.

================================================================
STEP 8 — CREATE A GITHUB ACCOUNT AND UPLOAD YOUR CODE
================================================================

--- 8A. CREATE A GITHUB ACCOUNT ---
(Do this 1 time)

  1. Go to:   https://github.com
  2. Click "Sign up"
  3. Enter your email address and click Continue
  4. Create a password and click Continue
  5. Choose a username — something like alexandriaanderson
     (no spaces, no special characters except dashes)
  6. Click Continue
  7. Complete the verification puzzle
  8. Check your email for a code from GitHub
  9. Type that code on the GitHub page
 10. GitHub asks some questions — just click Continue a few times
 11. Choose the FREE plan
 12. You are now on your GitHub dashboard ✅

--- 8B. CREATE A REPOSITORY ---
(Do this 1 time)

A repository is just a project folder stored on GitHub.

  1. In the top right corner of GitHub click the + icon
  2. Click "New repository"
  3. In "Repository name" type:   closet-mingle
  4. Leave it set to "Public"
  5. Do NOT check "Add a README file"
  6. Do NOT check anything under "Add .gitignore"
  7. Click "Create repository"
  8. You see a page with some commands on it
  9. LEAVE THIS PAGE OPEN in your browser

--- 8C. GET A GITHUB TOKEN ---
(Do this 1 time)

GitHub requires a token instead of a password to upload code.

  1. Click your profile picture in the top right of GitHub
  2. Click "Settings"
  3. Scroll ALL the way down the left sidebar
  4. Click "Developer settings"
     (it is at the very bottom of the sidebar)
  5. Click "Personal access tokens"
  6. Click "Tokens (classic)"
  7. Click "Generate new token"
  8. Click "Generate new token (classic)"
  9. In the "Note" field type:   closet-mingle
 10. For "Expiration" click the dropdown and select "90 days"
 11. You see a list of checkboxes
     Find "repo" and check that box
     (Checking "repo" automatically checks all the boxes under it — that is fine)
 12. Scroll down and click the green "Generate token" button
 13. A long code appears starting with   ghp_
     It looks like:   ghp_ABC123DEF456GHI789JKL
 14. COPY IT RIGHT NOW — you can only see it this one time
     If you leave this page without copying it you will need to make a new one
 15. Open your my-keys.txt in Notepad
 16. Add a line:
       GITHUB_TOKEN = ghp_ABC123DEF456GHI789JKL
     (use your real token)
 17. Save the file

--- 8D. OPEN COMMAND PROMPT IN YOUR PROJECT FOLDER ---
(Do this 1 time)

There is a special trick to open Command Prompt inside a specific folder.

  1. Open File Explorer
  2. Go to your Desktop
  3. Open the closet-mingle folder
  4. Look at the ADDRESS BAR at the top of File Explorer
     It shows something like:   This PC > Desktop > closet-mingle
  5. Click directly on that address bar
  6. The path text becomes selected and highlighted in blue
  7. Delete all that text
  8. Type exactly:   cmd
  9. Press Enter
 10. A Command Prompt window opens
 11. Look at the first line — it should say something like:
       C:\Users\Alexandria\Desktop\closet-mingle>
     That > at the end means you are in the right folder ✅

If it does NOT say closet-mingle at the end, you are in the wrong folder.
Close it and try the steps above again.

--- 8E. TELL GIT WHO YOU ARE ---
(Do this 1 time ever on your computer)

In the Command Prompt you just opened, type these 2 commands.
Press Enter after each one.
Replace the example email and name with your REAL email and name.

Command 1:
git config --global user.email "youremail@gmail.com"

Example of what it should look like:
git config --global user.email "alexandriaanderson@gmail.com"

Press Enter. You will see nothing — that is correct.

Command 2:
git config --global user.name "Alexandria Anderson"

Press Enter. You will see nothing — that is correct.

--- 8F. UPLOAD YOUR CODE TO GITHUB ---
(Do this 1 time)

Still in the same Command Prompt window, type each command below.
Press Enter after each command.
Wait for each command to finish before typing the next one.
"Finished" means the prompt shows   C:\...\closet-mingle>   again.

COMMAND 1 — Start tracking your folder:
git init

You should see:   Initialized empty Git repository in...

COMMAND 2 — Select all files to upload:
git add .

(That is "git add" then a space then a dot)
You should see nothing — that is correct.

COMMAND 3 — Take a snapshot of your code:
git commit -m "Initial Closet Mingle upload"

You should see a list of files scroll by.

COMMAND 4 — Connect to your GitHub:
(Replace YOURUSERNAME with your real GitHub username)
git remote add origin https://github.com/YOURUSERNAME/closet-mingle.git

Example:
git remote add origin https://github.com/alexandriaanderson/closet-mingle.git

You should see nothing — that is correct.

COMMAND 5:
git branch -M main

You should see nothing — that is correct.

COMMAND 6 — Upload the code:
git push -u origin main

GitHub will ask for your username:
  Type your GitHub username and press Enter

GitHub will ask for your password:
  DO NOT type your GitHub website password
  Instead paste your GITHUB_TOKEN from my-keys.txt
  (Press Ctrl+V to paste, or right-click and Paste)
  You will not see anything appear as you type/paste — that is normal
  Press Enter

You should see text like:
  Branch 'main' set up to track remote branch 'main' from 'origin'.

Your code is now on GitHub ✅

TO VERIFY:
  1. Go to github.com in your browser
  2. Click your profile picture
  3. Click "Your repositories"
  4. You should see "closet-mingle" listed
  5. Click on it and you should see all your files inside

================================================================
STEP 9 — SET UP VERCEL AND GO LIVE
================================================================

Vercel takes your GitHub code and makes it a real live website.

--- 9A. CREATE A VERCEL ACCOUNT ---
(Do this 1 time)

  1. Go to:   https://vercel.com
  2. Click "Sign Up"
  3. Click "Continue with GitHub"
  4. It redirects you to GitHub
  5. GitHub asks "Authorize Vercel" — click the green button
  6. Vercel asks what type of account
     Click "Personal"
  7. You are on your Vercel dashboard ✅

--- 9B. DEPLOY YOUR APP ---
(Do this 1 time)

  1. On the Vercel dashboard click "Add New..."
  2. Click "Project"
  3. You see a list of your GitHub repositories
  4. Find "closet-mingle" and click "Import"
  5. Vercel shows you a settings page
  6. Under "Framework Preset" it should say "Create React App"
     If it does not, click the dropdown and find "Create React App"
  7. Leave "Root Directory" as   ./
  8. Leave "Build Command" and "Output Directory" as their defaults

  NOW ADD YOUR ENVIRONMENT VARIABLES:
  Scroll down until you see "Environment Variables"
  You are going to add 7 variables.
  You add them ONE AT A TIME.
  For each one:
    a. Click "Add" or click the Name field
    b. Type the Name exactly as shown
    c. Click the Value field
    d. Type or paste the Value from your my-keys.txt file
    e. Press Enter or click Add

  Add these 7 variables one by one:

  Variable 1:
    Name:   REACT_APP_FIREBASE_API_KEY
    Value:  (your FIREBASE_API_KEY from my-keys.txt)

  Variable 2:
    Name:   REACT_APP_FIREBASE_AUTH_DOMAIN
    Value:  (your FIREBASE_AUTH_DOMAIN from my-keys.txt)

  Variable 3:
    Name:   REACT_APP_FIREBASE_PROJECT_ID
    Value:  (your FIREBASE_PROJECT_ID from my-keys.txt)

  Variable 4:
    Name:   REACT_APP_FIREBASE_STORAGE_BUCKET
    Value:  (your FIREBASE_STORAGE_BUCKET from my-keys.txt)

  Variable 5:
    Name:   REACT_APP_FIREBASE_MESSAGING_SENDER_ID
    Value:  (your FIREBASE_MESSAGING_SENDER_ID from my-keys.txt)

  Variable 6:
    Name:   REACT_APP_FIREBASE_APP_ID
    Value:  (your FIREBASE_APP_ID from my-keys.txt)

  Variable 7:
    Name:   REACT_APP_STRIPE_PUBLISHABLE_KEY
    Value:  (your STRIPE_PUBLISHABLE_KEY from my-keys.txt)

  After all 7 are added, click "Deploy"

  9. A page shows a building animation with logs scrolling
 10. Wait 2 to 4 minutes
 11. When you see confetti and "Congratulations!" your app is live!
 12. Click "Continue to Dashboard"
 13. At the top you see your URL
     It looks like one of these:
       https://closet-mingle.vercel.app
       https://closet-mingle-abc123def.vercel.app
 14. Copy that URL
 15. Add it to your my-keys.txt:
       MY_APP_URL = https://closet-mingle-abc123def.vercel.app
 16. Click the URL to open your live app ✅

--- 9C. ALLOW YOUR APP URL IN FIREBASE ---
(Do this 1 time — required or logins will not work on the live site)

  1. Go to:   https://console.firebase.google.com
  2. Click on your "closet-mingle" project
  3. Click "Authentication" in the left sidebar
  4. Click the "Settings" tab at the top of the page
     (It is next to "Users" and "Sign-in method")
  5. Scroll down to "Authorized domains"
  6. Click "Add domain"
  7. Type your Vercel URL — BUT ONLY the domain part
     NOT the full URL with https://
     For example if your URL is:
       https://closet-mingle-abc123.vercel.app
     Then type:
       closet-mingle-abc123.vercel.app
  8. Click "Add"

Logins will now work on your live site ✅

================================================================
STEP 10 — TEST YOUR APP ON YOUR COMPUTER FIRST
================================================================

Before you show anyone, test it on your own computer.

  1. Open Command Prompt inside your closet-mingle folder
     (The trick: open the folder in File Explorer, click the address bar,
      type cmd, press Enter)
  2. Type:   npm install
  3. Press Enter
  4. Wait 3 to 7 minutes — many lines scroll by — that is normal
  5. When it stops and shows your prompt again, type:   npm start
  6. Press Enter
  7. Wait about 30 seconds
  8. Your web browser opens automatically to:   http://localhost:3000
  9. You should see the Closet Mingle welcome screen

TRY THESE THINGS:
  ✅ Click "Create an account"
  ✅ Pick "Client"
  ✅ Type a fake name, email, and password
  ✅ Click Continue
  ✅ You should see the plan selection screen
  ✅ Click "Free" and "Get started"
  ✅ You should see the home screen

TO STOP THE TEST APP:
  Go to Command Prompt
  Press Ctrl + C
  Type   Y
  Press Enter

================================================================
STEP 11 — ADD THE APP TO YOUR PHONE
================================================================

--- ON IPHONE ---

  1. Open the SAFARI browser on your iPhone
     It MUST be Safari. Not Chrome. Not Edge. Safari only.
  2. In the address bar type your Vercel URL:
       https://closet-mingle-abc123.vercel.app
  3. Press Go
  4. The app loads
  5. Look at the very BOTTOM of your screen
  6. Find the Share button — it looks like a square with an arrow pointing UP
  7. Tap it
  8. A menu slides up from the bottom with many options
  9. SCROLL DOWN through those options
 10. Find "Add to Home Screen" and tap it
 11. A screen shows a preview of the icon and lets you name it
 12. Change the name to:   Closet Mingle
 13. Tap "Add" in the TOP RIGHT corner of the screen
 14. Press your home button or swipe up to go to your home screen
 15. You will see the Closet Mingle icon like a real app ✅

--- ON ANDROID ---

  1. Open CHROME on your Android phone
  2. Go to your Vercel URL
  3. Tap the three dots in the top right corner
  4. Tap "Add to Home screen"
  5. Tap "Add"
  6. The icon appears on your home screen ✅

================================================================
COMMON PROBLEMS AND EXACT FIXES
================================================================

PROBLEM: I cannot see .env.example in my folder
FIX: Open File Explorer → Click View at top → Click Show → Click Hidden items

PROBLEM: npm install gives red errors about "ENOENT" or "not found"
FIX: You are in the wrong folder.
     Open Command Prompt and type:   cd Desktop\closet-mingle
     Then try npm install again.

PROBLEM: npm start works but the screen is white/blank
FIX: Your .env.local has wrong values.
     Open .env.local in Notepad and check every line.
     Make sure there are no spaces around the = signs.
     Make sure there are no quote marks.

PROBLEM: I can log in on localhost but not on the live Vercel site
FIX: You skipped Step 9C. Go back and add your Vercel domain to Firebase.

PROBLEM: Photos do not upload
FIX: Go to Firebase → Storage → Rules → make sure you published the rules in Step 5E.

PROBLEM: git push asks for a password and nothing I type works
FIX: Use your GitHub TOKEN (from my-keys.txt, starts with ghp_)
     NOT your GitHub website password.

PROBLEM: Vercel deployment fails with an error
FIX: Go to Vercel → Your project → Settings → Environment Variables
     Make sure all 7 variables are there with the correct names.
     The names must start with REACT_APP_ exactly.

================================================================
EVERY STEP — HOW MANY TIMES YOU DO IT
================================================================

Here is every single action in this guide and how many times to do it.

Install Node.js ................................ 1 time ever
Install VS Code ................................ 1 time ever
Install Git .................................... 1 time ever
Create Firebase account ........................ 1 time ever
Create Firebase project ........................ 1 time (per app)
Turn on Email/Password in Firebase Auth ........ 1 time
Create Firestore database ...................... 1 time
Paste Firestore security rules ................. 1 time
Turn on Firebase Storage ....................... 1 time
Paste Storage security rules ................... 1 time
Get Firebase config keys ....................... 1 time
Create Stripe account .......................... 1 time ever
Create Premium Monthly product in Stripe ....... 1 time
Create Stylist Session product in Stripe ....... 1 time
Get Stripe publishable key ..................... 1 time
Save all keys to my-keys.txt ................... ongoing (add to it each time)
Create .env.local file ......................... 1 time
Fill in .env.local with keys ................... 1 time
Edit stripe.js with price IDs .................. 1 time
Create GitHub account .......................... 1 time ever
Create GitHub repository ....................... 1 time (per app)
Get GitHub personal access token ............... 1 time
Set git config email and name .................. 1 time ever
Run git init ................................... 1 time
Run git add . .................................. 1 time (more times if you update code)
Run git commit ................................. 1 time (more times if you update code)
Run git remote add ............................. 1 time
Run git branch -M main ......................... 1 time
Run git push ................................... 1 time (more times if you update code)
Create Vercel account .......................... 1 time ever
Deploy project on Vercel ....................... 1 time (updates happen automatically)
Add environment variables to Vercel ............ 1 time (7 variables total)
Add Vercel domain to Firebase .................. 1 time
Run npm install ................................ 1 time (or after code changes)
Run npm start .................................. every time you want to test locally
Add app to phone home screen ................... 1 time per phone

================================================================
ABOUT YOUR PYTHON AND JUPYTER SITUATION
================================================================

You said you open Jupyter Notebook by typing:   python -m notebook

This means:
  ✅ Python is installed on your computer
  ✅ Jupyter is installed
  ✅ Your PATH might not be set up (that is why you need the full command)

This does NOT affect Closet Mingle at all.
Node.js and Python are totally separate.
Having Python on your computer does not help or hurt this project.
You are just using Python for other things (data analysis etc.)
and Node.js for Closet Mingle.

They do not interfere with each other. You are fine.

================================================================
END OF GUIDE
================================================================
