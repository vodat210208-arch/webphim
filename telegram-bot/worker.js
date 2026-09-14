// ==========================================================================
// AURA CINEMA - 24/7 TELEGRAM BOT (CLOUDFLARE WORKER)
// ==========================================================================

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Aura Cinema Telegram Bot is running 24/7!", { status: 200 });
    }

    const BOT_TOKEN = env.BOT_TOKEN;
    const ADMIN_CHAT_ID = env.ADMIN_CHAT_ID;
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const GITHUB_REPO = env.GITHUB_REPO || "vodat210208-arch/webphim";
    const GITHUB_BRANCH = env.GITHUB_BRANCH || "main";
    const FILE_PATH = "data/movies.json";
    const SITE_URL = "https://vodat210208-arch.github.io/webphim/";

    try {
      const update = await request.json();
      if (!update.message || !update.message.text) {
        return new Response("OK", { status: 200 });
      }

      const msg = update.message;
      const chatId = msg.chat.id.toString();
      const text = msg.text.trim();

      // Bảo mật: Chỉ cho phép Quản trị viên sử dụng
      if (chatId !== ADMIN_CHAT_ID) {
        await sendTelegram(BOT_TOKEN, chatId, "⛔ *Từ chối truy cập:* Bạn không có quyền quản trị bot này.");
        return new Response("OK", { status: 200 });
      }

      // Xử lý các lệnh
      if (text === "/start" || text === "/help" || text.toLowerCase() === "xin chào") {
        const welcome = `👋 *Chào Bạn!* Tôi là Bot quản trị của *Aura Cinema*.\n\n` +
          `🎬 *Cách thêm phim mới lên web:*\n` +
          `Gửi tin nhắn theo cú pháp:\n` +
          `\`/them Tên phim | Link video | Thể loại | Link ảnh poster | Thời lượng\`\n\n` +
          `💡 *Ví dụ đơn giản nhất (chỉ cần Tên và Link):*\n` +
          `\`/them Avatar 2 | https://drive.google.com/file/d/xxx/view\`\n\n` +
          `💡 *Ví dụ đầy đủ:*\n` +
          `\`/them Dune 2 | https://drive.google.com/xxx | Viễn Tưởng, Hành Động | https://link-anh.jpg | 2h 45m\`\n\n` +
          `📋 *Các lệnh khác:*\n` +
          `• \`/danhsach\` : Xem danh sách phim đang có\n` +
          `• \`/xoa Tên phim\` : Xóa phim khỏi web`;
        await sendTelegram(BOT_TOKEN, chatId, welcome);
        return new Response("OK", { status: 200 });
      }

      // Lệnh xem danh sách phim
      if (text === "/danhsach" || text === "/list") {
        await handleListMovies(BOT_TOKEN, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, FILE_PATH, SITE_URL, chatId);
        return new Response("OK", { status: 200 });
      }

      // Lệnh xóa phim
      if (text.startsWith("/xoa ")) {
        const movieTitleToDelete = text.replace("/xoa ", "").trim();
        await handleDeleteMovie(BOT_TOKEN, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, FILE_PATH, chatId, movieTitleToDelete);
        return new Response("OK", { status: 200 });
      }

      // Lệnh thêm phim
      if (text.startsWith("/them ") || text.startsWith("/add ")) {
        const rawParams = text.replace(/^(\/them|\/add)\s+/, "").trim();
        await handleAddMovie(BOT_TOKEN, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, FILE_PATH, SITE_URL, chatId, rawParams);
        return new Response("OK", { status: 200 });
      }

      // Nếu gửi tin nhắn khác
      await sendTelegram(
        BOT_TOKEN,
        chatId,
        `❓ *Cú pháp chưa đúng.*\nĐể thêm phim, hãy gửi theo mẫu:\n\`/them Tên phim | Link video\`\n\nHoặc gửi \`/help\` để xem hướng dẫn chi tiết.`
      );
      return new Response("OK", { status: 200 });

    } catch (err) {
      console.error(err);
      return new Response("Error: " + err.message, { status: 200 });
    }
  }
};

async function sendTelegram(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
      disable_web_page_preview: true
    })
  });
}

async function getMoviesFromGitHub(githubToken, repo, branch, filePath) {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${githubToken}`,
      "User-Agent": "AuraCinemaBot",
      "Accept": "application/vnd.github.v3+json"
    }
  });

  if (!res.ok) throw new Error("Không thể đọc file từ GitHub");
  const data = await res.json();
  const rawJson = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ""))));
  const movies = JSON.parse(rawJson);
  return { movies, sha: data.sha };
}

async function saveMoviesToGitHub(githubToken, repo, branch, filePath, movies, sha, commitMsg) {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const prettyJson = JSON.stringify(movies, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(prettyJson)));

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${githubToken}`,
      "User-Agent": "AuraCinemaBot",
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: commitMsg,
      content: base64Content,
      sha: sha,
      branch: branch
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Lỗi khi ghi GitHub: " + errText);
  }
  return await res.json();
}

async function handleAddMovie(botToken, githubToken, repo, branch, filePath, siteUrl, chatId, paramsString) {
  const parts = paramsString.split("|").map(p => p.trim());
  if (parts.length < 2) {
    await sendTelegram(botToken, chatId, "⚠️ *Thiếu thông tin:* Cần tối thiểu Tên phim và Link video.\nVí dụ:\n`/them Avatar 2 | https://link-video.mp4`");
    return;
  }

  const title = parts[0];
  const videoUrl = parts[1];
  const genresRaw = parts[2] || "Hành Động, Viễn Tưởng";
  const poster = parts[3] || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80";
  const duration = parts[4] || "1h 50m";

  const genres = genresRaw.split(",").map(g => g.trim()).filter(g => g.length > 0);
  const id = "film-" + Date.now().toString(36);

  const isDirect = videoUrl.match(/\.(mp4|webm|ogg|m4v)(\?.*)?$/i);
  const videoType = isDirect ? "direct" : "iframe";

  await sendTelegram(botToken, chatId, `⏳ Đang thêm phim *${title}* lên web...`);

  try {
    const { movies, sha } = await getMoviesFromGitHub(githubToken, repo, branch, filePath);

    const newMovie = {
      id: id,
      title: title,
      originalTitle: title,
      year: new Date().getFullYear(),
      duration: duration,
      quality: "4K Ultra",
      badge: "Vietsub",
      genres: genres,
      rating: "8.8",
      poster: poster,
      backdrop: poster,
      description: `Tác phẩm ${title} - Thể loại ${genres.join(", ")}, thời lượng ${duration}. Được đăng tải tự động từ Telegram Bot.`,
      featured: false,
      servers: [
        {
          name: "Server Chính",
          type: videoType,
          url: videoUrl
        }
      ]
    };

    movies.unshift(newMovie);

    await saveMoviesToGitHub(githubToken, repo, branch, filePath, movies, sha, `feat(bot): add movie "${title}" via Telegram`);

    await sendTelegram(
      botToken,
      chatId,
      `🎉 *THÀNH CÔNG!*\n\n` +
      `🎬 Phim: *${title}*\n` +
      `⏱ Thời lượng: \`${duration}\`\n` +
      `🏷 Thể loại: \`${genres.join(", ")}\`\n\n` +
      `🌐 Trang web sẽ tự cập nhật trong khoảng 30 - 60 giây tại:\n${siteUrl}`
    );
  } catch (err) {
    console.error(err);
    await sendTelegram(botToken, chatId, `❌ *Lỗi cập nhật:* ${err.message}`);
  }
}

async function handleListMovies(botToken, githubToken, repo, branch, filePath, siteUrl, chatId) {
  try {
    const { movies } = await getMoviesFromGitHub(githubToken, repo, branch, filePath);
    if (movies.length === 0) {
      await sendTelegram(botToken, chatId, "Hiện chưa có phim nào trong danh sách.");
      return;
    }

    let text = `🎬 *Danh sách phim hiện tại (${movies.length} phim):*\n\n`;
    movies.forEach((m, idx) => {
      text += `${idx + 1}. *${m.title}* (${m.year || 2024}) - \`${m.duration}\`\n`;
    });
    text += `\n🌐 Xem tại: ${siteUrl}`;
    await sendTelegram(botToken, chatId, text);
  } catch (err) {
    await sendTelegram(botToken, chatId, `❌ Lỗi lấy danh sách: ${err.message}`);
  }
}

async function handleDeleteMovie(botToken, githubToken, repo, branch, filePath, chatId, titleToDelete) {
  try {
    const { movies, sha } = await getMoviesFromGitHub(githubToken, repo, branch, filePath);
    const target = titleToDelete.toLowerCase();
    const initialCount = movies.length;

    const filtered = movies.filter(m => !m.title.toLowerCase().includes(target));

    if (filtered.length === initialCount) {
      await sendTelegram(botToken, chatId, `⚠️ Không tìm thấy phim nào có tên chứa "${titleToDelete}".`);
      return;
    }

    await saveMoviesToGitHub(githubToken, repo, branch, filePath, filtered, sha, `chore(bot): remove movie "${titleToDelete}" via Telegram`);
    await sendTelegram(botToken, chatId, `🗑 Đã xóa phim có tên chứa "*${titleToDelete}*" khỏi danh sách.`);
  } catch (err) {
    await sendTelegram(botToken, chatId, `❌ Lỗi khi xóa: ${err.message}`);
  }
}
