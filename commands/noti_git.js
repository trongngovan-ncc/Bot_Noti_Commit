const axios = require("axios");

module.exports = async function handleNotificationGit(client, result, channelId, additionalInfo = {}, token) {
  try {
     
    const { repoLink, userName, userEmail } = additionalInfo;

    const llmResponse = await axios.post(
      "https://llm-git-review.onrender.com/llm-review",
      { diff: result, repoLink, userName, userEmail },
      { headers: { 
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
       }
      }
    );

    const reviewResult = llmResponse.data; 
    console.log("LLM Review Result:", reviewResult);

    const channel = await client.channels.fetch(channelId);

    let message = "";

    if (typeof reviewResult === "object" && reviewResult.review) {
      message = reviewResult.review;
    } else if (typeof reviewResult === "string") {
      message = reviewResult;
    } else {
      message = JSON.stringify(reviewResult);
    }
    let infoHeader = "";
    let repoStart = 0, repoEnd = 0;
    infoHeader += `📦 Repo: ${repoLink}\n`;
    repoStart = infoHeader.indexOf(repoLink);
    repoEnd = repoStart + repoLink.length;
    if (userName && userEmail) infoHeader += `👤 User: ${userName} || ✉️ Email: ${userEmail}\n`;
    if (infoHeader) message = infoHeader + message;

    const mk = [
      { type: 'lk', s: repoStart, e: repoEnd, url: repoLink },
      { type: 'pre', s: infoHeader.length, e: message.length }
    ];

    await channel.send({ t: message , mk });
    } catch (err) {
      console.error(err);
    }
}

// const axios = require("axios");

// const PROMPT_REVIEW = `Bạn là một senior code reviewer có nhiều kinh nghiệm. Nhiệm vụ: đọc Git diff dưới đây và đưa review ngắn gọn, hữu dụng theo cấu trúc MỞ BÀI → THÂN BÀI → KẾT BÀI.

// YÊU CẦU CHUNG

// Trọng tâm: phân tích các vấn đề tiềm ẩn về bugs, security, và code style.
// Chỉ nêu những điểm chính, không đi sâu vào chi tiết không cần thiết.
// Trả lời CHỈ BẰNG TIẾNG VIỆT.
// Trình bày bằng danh sách gạch đầu dòng.
// Chỉ nhận xét dựa trên Git diff (không suy đoán code bên ngoài diff vì dễ bị bịa đặt).

// MỞ BÀI

// Viết 2–4 câu tóm tắt nhanh các thay đổi chính của commit (ví dụ: "Commit này thay đổi X, thêm Y, sửa Z") và một đánh giá tổng quan ngắn (ví dụ: "Tổng quan: cần chỉnh sửa / chấp nhận / cải tiến nhẹ").

// THÂN BÀI
// - Đi vào chi tiết sự thay đổi với mỗi file như sau.
// * Sử dụng các biểu tượng sau để đánh giá mức độ thay đổi của từng file:
// * ✅ (Tích cực): Thay đổi là tốt, cải thiện code, hiệu suất, hoặc thêm tính năng mới.
// * ➖ (Trung bình): Thay đổi nhỏ, không ảnh hưởng nhiều đến logic cốt lõi. Ví dụ: sửa lỗi chính tả, định dạng.
// * ❌ (Tiêu cực): Thay đổi gây ra lỗi, có vấn đề về bảo mật, hoặc làm giảm chất lượng code.

// Luôn có đề xuất và đánh giá mức độ nghiêm trọng của mỗi vấn đề (High / Medium / Low) bên cạnh đề xuất.

// KẾT BÀI

// Tóm tắt 2–3 câu: những hành động cần làm ngay (priority list: High → Medium → Low).
// Một dòng nhận xét tổng quát về chất lượng commit (ví dụ: "Chấp nhận sau chỉnh sửa nhỏ" hoặc "Không chấp nhận — cần fix trước khi merge").

// LƯU Ý:
// - Mở bài, thân bài, kết bài chỉ là để tôi phân biệt các phần, không cần nhắc lại trong câu trả lời. Ghi là Intro, Details, Conclude
// GIT DIFF CẦN REVIEW:
// {DIFF}`;

// module.exports = async function handleNotificationGit(client, result, channelId, additionalInfo = {}, token) {
//   try {
//     const { repoLink, userName, userEmail } = additionalInfo;
//     const geminiApiKey = process.env.GEMINI_API_KEY;
//     const prompt = PROMPT_REVIEW.replace('{DIFF}', result);
//     let reviewResult = "Không có kết quả.";
//     try {
//       const response = await axios.post(
//         'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
//         {
//           contents: [{ parts: [{ text: prompt }] }]
//         },
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             'X-goog-api-key': geminiApiKey
//           }
//         }
//       );
//       reviewResult = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không có kết quả.";
//     } catch (e) {
//       reviewResult = "[Gemini API lỗi] " + (e.message || "Không thể review code");
//     }

//     const channel = await client.channels.fetch(channelId);
//     let message = reviewResult;
//     let infoHeader = "";
//     let repoStart = 0, repoEnd = 0;
//     if (repoLink) {
//       infoHeader += `📦 Repo: ${repoLink}\n`;
//       repoStart = infoHeader.indexOf(repoLink);
//       repoEnd = repoStart + repoLink.length;
//     }
//     if (userName && userEmail) infoHeader += `👤 User: ${userName} || ✉️ Email: ${userEmail}\n`;
//     if (infoHeader) message = infoHeader + message;
//     const mk = [
//       repoLink ? { type: 'lk', s: repoStart, e: repoEnd, url: repoLink } : null,
//       { type: 'pre', s: infoHeader.length, e: message.length }
//     ].filter(Boolean);
//     await channel.send({ t: message , mk });
//   } catch (err) {
//     console.error(err);
//   }
// }

