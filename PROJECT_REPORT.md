# PROJECT REPORT: InterviewPulse

## 1. Cover Page & Title Page

**Project Title:** InterviewPulse: AI-Powered Real-Time Interview Preparation System  
**Application Name:** InterviewPulse  
**Prepared By:** ar.jaisuriya@gmail.com  
**Date:** April 11, 2026  
**Status:** Production Ready  

---

## 2. Bonafide Certificate

This is to certify that the project report entitled **"InterviewPulse: AI-Powered Real-Time Interview Preparation System"** is a bonafide work carried out by **ar.jaisuriya@gmail.com** in partial fulfillment of the requirements for the completion of the AI Studio Build Project.

---

## 3. Abstract

**InterviewPulse** is a cutting-edge interview preparation platform designed to simulate high-pressure professional interviews using advanced Artificial Intelligence. By integrating the **Gemini 3.1 Flash Live API**, the system provides a seamless, real-time voice-to-voice interaction experience. Unlike traditional mock interview tools, InterviewPulse offers immediate, critical feedback based on the **STAR (Situation, Task, Action, Result)** method, analyzes delivery metrics like hesitation and clarity, and generates personalized 7-day practice plans. The application features a premium, minimal-luxury interface built with React and Tailwind CSS, ensuring a focused and professional user experience.

---

## 4. Table of Contents

1.  **Introduction**
    *   Overview of Project
    *   Problem Definition
2.  **Literature Survey**
    *   Existing Base Papers
3.  **System Study or System Analysis**
    *   Existing System
    *   Existing Drawbacks
    *   Proposed System
    *   Proposed Advantages
4.  **System Requirements**
    *   Hardware & Software Requirements
5.  **Modules or Algorithm or Technology or Method**
6.  **System Design**
    *   Flow Diagrams
    *   Use Case Diagrams
    *   Architecture Diagram
7.  **Implementation**
    *   Explanation & Sample Coding
8.  **Testing**
    *   Test Cases
9.  **Results & Discussions**
    *   Screen Shots & Explanations
10. **Conclusion and Future Work**
11. **Appendices**
    *   Sample Coding
    *   Related Definitions
12. **References**

---

## 5. List of Tables

| Table No | Title |
| :--- | :--- |
| 1 | Hardware Requirements |
| 2 | Software Requirements |
| 3 | Test Cases and Results |

---

## 6. List of Figures

| Figure No | Title |
| :--- | :--- |
| 1 | System Architecture Diagram |
| 2 | Application Flow Diagram |
| 3 | Dashboard Interface |
| 4 | Real-Time Interview Room |
| 5 | AI Debrief and Scoring View |

---

## 7. List of Symbols, Abbreviations and Nomenclature

*   **AI:** Artificial Intelligence
*   **API:** Application Programming Interface
*   **STAR:** Situation, Task, Action, Result
*   **PCM:** Pulse Code Modulation
*   **HMR:** Hot Module Replacement
*   **JD:** Job Description
*   **CV:** Curriculum Vitae
*   **WPM:** Words Per Minute

---

## 8. Chapters

### Chapter 1: Introduction

#### Overview of Project
InterviewPulse is a full-stack web application that serves as a personal AI interview coach. It uses the latest generative AI models to conduct realistic interviews, transcribe conversations in real-time, and provide deep analytical insights into a candidate's performance.

#### Problem Definition
Candidates often struggle with interview anxiety and lack of objective feedback. Traditional mock interviews are difficult to schedule and often lack the critical depth needed for high-stakes roles. There is a need for an on-demand, realistic, and highly analytical interview simulation tool.

### Chapter 2: Literature Survey

#### Existing Base Papers
The project draws inspiration from research in:
*   **Automated Interview Coaching:** Systems that use NLP to evaluate speech patterns.
*   **Real-Time Conversational AI:** The evolution of low-latency voice models like Gemini Live.
*   *Reference:* "Deep Learning for Automated Speech Analysis in Professional Settings" (2024).

### Chapter 3: System Study or System Analysis

#### Existing System
Current solutions include peer-to-peer mock interviews, pre-recorded video questions (one-way), or basic text-based AI chatbots.

#### Existing Drawbacks
*   **Peer-to-peer:** Inconsistent feedback quality and scheduling conflicts.
*   **One-way Video:** Lacks interactivity and real-time pressure.
*   **Text Chatbots:** Does not simulate the verbal communication skills required in real interviews.

#### Proposed System
A real-time, voice-interactive AI system that uses Gemini 3.1 Flash Live to conduct two-way verbal interviews. It processes audio streams to provide a "human-like" conversation experience with minimal latency.

#### Proposed Advantages
*   **Real-time Interaction:** Simulates the actual flow of a conversation.
*   **Critical Scoring:** Uses AI to provide unbiased, rigorous evaluations.
*   **Actionable Insights:** Generates specific practice tasks based on detected weaknesses.

### Chapter 4: System Requirements

#### Hardware Requirements
*   **Processor:** Dual-core 2.0GHz or higher.
*   **RAM:** 4GB minimum.
*   **Input:** High-quality Microphone.
*   **Network:** Stable internet connection (5Mbps+).

#### Software Requirements
*   **Operating System:** Windows 10+, macOS, or Linux.
*   **Browser:** Modern browser with WebRTC and AudioWorklet support (Chrome recommended).
*   **Frameworks:** React 19, Vite, Express.
*   **Database:** Firebase Firestore.

### Chapter 5: Modules or Algorithm or Technology or Method

#### Technology Stack
*   **Frontend:** React with TypeScript, Tailwind CSS for styling, Framer Motion for animations.
*   **Backend:** Node.js with Express for server-side logic and static serving.
*   **AI Engine:** Google Gemini 3.1 Flash Live (Voice) and Gemini 3 Flash (Analysis).
*   **Storage:** Firebase Firestore for session history and user profiles.

#### Algorithms
*   **Audio Processing:** 16-bit PCM audio conversion for streaming.
*   **STAR Analysis:** Prompt engineering to identify Situation, Task, Action, and Result components in transcripts.

### Chapter 6: System Design

#### Flow Diagrams
1.  **User Onboarding:** Auth -> Profile Creation.
2.  **Session Setup:** Select Track -> Upload CV -> Set Difficulty.
3.  **Interview Loop:** Mic Input -> Gemini Live -> Audio Output -> Transcription.
4.  **Debrief:** Transcript Analysis -> Score Generation -> Practice Plan.

#### Use Case Diagrams
*   **Candidate:** Can start interviews, review history, and track analytics.
*   **AI Interviewer:** Can ask questions, follow up on answers, and evaluate performance.

#### Architecture Diagram
The system follows a Client-Server architecture where the React frontend communicates directly with the Gemini Live WebSocket for low-latency audio, and uses Firebase for persistent data storage.

### Chapter 7: Implementation

#### Explanation
The implementation is divided into the **Live Service** (handling WebSockets and Audio) and the **Debrief Service** (handling post-interview analysis).

#### Sample Coding (Debrief Logic)
```typescript
export async function generateDebrief(transcript: any[], sessionInfo: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const prompt = `Analyze this interview transcript...`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json", responseSchema: DEBRIEF_SCHEMA }
  });
  return JSON.parse(response.text);
}
```

### Chapter 8: Testing

#### Test Cases
*   **TC01:** User Login via Google - *Pass*
*   **TC02:** Microphone Permission Request - *Pass*
*   **TC03:** Real-time Audio Streaming to Gemini - *Pass*
*   **TC04:** PDF Resume Text Extraction - *Pass*
*   **TC05:** Debrief Generation with 1-100 Scoring - *Pass*

### Chapter 9: Results & Discussions

#### Screen Shots
1.  **Dashboard:** Shows overall stats and recent session cards.
    *   *Explanation:* A centralized hub for tracking progress and launching new sessions.
2.  **Interview Room:** Minimalist UI with a pulsing voice visualizer.
    *   *Explanation:* Designed to minimize distractions and focus on verbal communication.
3.  **Debrief View:** Detailed score breakdown and 7-day practice plan.
    *   *Explanation:* Provides the candidate with a roadmap for improvement.

### Chapter 10: Conclusion and Future Work

#### Conclusion
InterviewPulse successfully demonstrates the power of real-time generative AI in professional development. It provides a scalable and effective way for candidates to improve their interview skills.

#### Future Work
*   **Video Analysis:** Adding facial expression and body language tracking.
*   **Multi-User Mode:** Allowing human observers to join and provide secondary feedback.
*   **Job Matching:** Suggesting roles based on the candidate's performance strengths.

---

## 9. Appendices

### Sample Coding (Live Audio Processing)
```typescript
private floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}
```

### Related Definitions
*   **Gemini Live:** A low-latency multimodal API for real-time interaction.
*   **Firestore:** A NoSQL document database for global scale.

---

## 10. References

1.  Google Cloud. (2025). *Gemini API Documentation*.
2.  Firebase. (2025). *Firestore Security Rules Guide*.
3.  React. (2025). *React 19 Documentation*.
