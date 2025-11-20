const fs = require('fs');
const path = require('path');

module.exports = async function handleIntroGitHook(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const msg = await channel.messages.fetch(event.message_id);
  const intro = `📝 Hướng dẫn sử dụng Git Hook để gửi diff lên bot review:\n1. Tạo file pre-commit (nhớ đổi tên thành pre-commit không có đuôi file đâu nhé!) trong thư mục .git/hooks của repo.\n2. Copy đoạn code mẫu bên dưới vào file pre-commit.\n3. Thay <API_token> bằng link githook bạn nhận được từ lệnh *create_githook <repolink>.`;
  const userId = event.sender_id;
  const preCommitPath = path.join(__dirname, '../constant/pre-commit');
  let preCommitCode = '';
  try {
    preCommitCode = fs.readFileSync(preCommitPath, 'utf8');
  } catch {}

  let t = intro;
  let mk = [];
  if (preCommitCode && preCommitCode.length > 0) {
    t += '\n' + preCommitCode;
    mk = [
      { type: 'pre', s: intro.length + 1, e: t.length }
    ];
  }

  const CLAN_ID = process.env.CLAN_ID;
  const clan = await client.clans.fetch(CLAN_ID);
  const userObj = await clan.users.fetch(userId);
  // await userObj.sendDM({
  //   t, mk
  // });
  // await msg.reply({ t: 'Done, check your DM for the introduction githook!' });
  await msg.reply({  t, mk});

};
