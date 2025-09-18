# Bot Noti Commit (Git + GitHub + Jira)

Bot Noti Commit là bot tích hợp cho hệ sinh thái Mezon, giúp tự động nhận thông báo và review code từ Git Local, Github, cũng như nhận notification từ Jira về các sự kiện quan trọng (issue, sprint, project, v.v.).

## Tính năng chính
- Nhận thông báo push, pull request, review từ GitHub về kênh Mezon.
- Nhận notification các sự kiện Jira (issue, sprint, project, comment, v.v.) về kênh Mezon.
- Nhận thông báo pre-commit từ git local, tích hợp review code tự động qua LLM.


## Cài đặt

```bash
# Clone repo
$ git clone <repo-url>
$ cd Bot_Noti_Commit

# Cài dependencies
$ yarn
# hoặc
$ npm install
```

Tạo file `.env`  điền các biến môi trường:+
- `APPLICATION_TOKEN`: Token bot từ ứng dụng Mezon
- `WEBHOOK_SECRET`, `GITHOOK_SECRET`, `JIRA_SECRET`: Secret cho các API bảo mật
- `IP_HOST`: Địa chỉ public của server bot (dùng cho webhook)

## Chạy bot

```bash
$ yarn start
# hoặc
$ npm start
```

## Hướng dẫn sử dụng

### 1. Tạo webhook GitHub
- Dùng lệnh: `*create_webhook <usergithub/reponame>`
- Copy URL trả về, dán vào phần Webhook của GitHub repo.

### 2. Tạo API cho git pre-commit
- Dùng lệnh: `*create_githook <usergithub/reponame>`
- Copy URL trả về, cấu hình vào pre-commit hook của git.

### 3. Tạo webhook Jira
- Dùng lệnh: `*create_jirahook`
- Copy URL trả về, dán vào phần cấu hình webhook của Jira (chọn các event bạn muốn nhận).

### 4. Hướng dẫn chi tiết
- Dùng lệnh `*intro` để xem tất cả lệnh và hướng dẫn tích hợp.

## Danh sách lệnh bot

| Lệnh | Mô tả |
|------|-------|
| *intro | Hiển thị hướng dẫn tổng quan bot, các lệnh tích hợp |
| *intro_githook | Hướng dẫn tích hợp git pre-commit gửi diff lên bot (có code mẫu) |
| *intro_webhook | Hướng dẫn cấu hình webhook GitHub (có hình minh họa) |
| *create_webhook <usergithub/reponame> | Tạo URL webhook bảo mật cho repo GitHub, dùng để cấu hình webhook trên GitHub |
| *create_githook <usergithub/reponame> | Tạo API bảo mật cho git pre-commit, dùng cho hook gửi diff lên bot |
| *create_jirahook | Tạo URL webhook bảo mật cho Jira, dùng để cấu hình webhook trên Jira |

### Ví dụ sử dụng

- Tạo webhook GitHub:
  ```
  *create_webhook trongngovan-ncc/Bot_Noti_Commit
  ```
- Tạo API cho git pre-commit:
  ```
  *create_githook trongngovan-ncc/Bot_Noti_Commit
  ```
- Tạo webhook Jira:
  ```
  *create_jirahook
  ```

Sau khi tạo, copy URL trả về và cấu hình vào Git/GitHub/Jira tương ứng.

## Hướng dẫn deploy bot lên Render.com

1. **Đẩy code lên GitHub**
   - Đảm bảo toàn bộ source code đã được push lên một repository GitHub riêng tư hoặc công khai.

2. **Tạo tài khoản và kết nối Render với GitHub**
   - Truy cập https://dashboard.render.com/ và đăng ký/đăng nhập.
   - Chọn "New +" > "Web Service".
   - Kết nối tài khoản GitHub, chọn repo chứa bot.

3. **Thiết lập dịch vụ**
   - Environment: Node
   - Build Command: `yarn` hoặc `npm install`
   - Start Command: `yarn start` hoặc `npm start`
   - Region: Chọn Singapore hoặc US/EU tùy vị trí user.

4. **Cấu hình biến môi trường (Environment Variables)**
   - APPLICATION_TOKEN: Token ứng dụng Mezon
   - WEBHOOK_SECRET, GITHOOK_SECRET, JIRA_SECRET: Secret cho các API bảo mật
   - IP_HOST: URL public của Render (sẽ có sau khi deploy lần đầu, cần sửa lại cho đúng)
   - URL_IMAGE: (nếu dùng hình hướng dẫn webhook)

5. **Deploy lần đầu**
   - Nhấn "Create Web Service" để Render tự động build và chạy bot.
   - Sau khi deploy xong, lấy public URL (ví dụ: `https://bot-noti-commit.onrender.com`) để cấu hình webhook GitHub/Jira.
   - Nếu cần, cập nhật lại biến IP_HOST = public URL này rồi "Deploy latest commit" lại lần nữa.

6. **Cấu hình webhook trên GitHub/Jira**
   - Dùng các lệnh tạo webhook như hướng dẫn ở trên, copy URL trả về và dán vào phần cấu hình webhook của GitHub/Jira.

> **Lưu ý:**
> - Render có thể sleep app nếu lâu không có request (bản free), hãy kiểm tra lại nếu thấy bot không phản hồi.
> - Có thể dùng custom domain nếu muốn.

## Bảo mật
- Mỗi webhook/API đều có token JWT, chỉ channel và repo , project được cấp phép mới nhận được notification.
- Token có thời hạn, cần tạo lại khi hết hạn.



