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

Tạo file `.env`  điền các biến môi trường:
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

## Bảo mật
- Mỗi webhook/API đều có token JWT, chỉ channel và repo , project được cấp phép mới nhận được notification.
- Token có thời hạn, cần tạo lại khi hết hạn.



