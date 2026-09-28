// House copy library for the Urban Forest pilot (EN / BM / 中文).
// Written only from claims in lib/data/urban-forest.ts. No prices, no returns,
// no unit counts, no named locality (Bercham/Tambun conflict is unresolved).
// Prompt version recorded on each variant so edits and AI rewrites stay traceable.

import type { Lang } from "@/lib/types";

export const COPY_PROMPT_VERSION = "house-v1";

export interface AngleCopy {
  hooks: [string, string, string];
  short: string;
  long: string;
  headlines: [string, string, string];
}

export const CTA: Record<Lang, { visit: string; register: string }> = {
  en: { visit: "Book a gallery visit", register: "Register interest" },
  bm: { visit: "Tempah lawatan galeri", register: "Daftar minat" },
  zh: { visit: "预约参观展厅", register: "登记意向" },
};

export const ARTIST_IMPRESSION: Record<Lang, string> = {
  en: "Artist's impression",
  bm: "Gambaran artis",
  zh: "艺术家构想图",
};

export const library: Record<string, Record<Lang, AngleCopy>> = {
  night: {
    en: {
      hooks: [
        "Ipoh sleeps early. Not for much longer.",
        "The day trip ends at sunset. What if it didn't?",
        "Kopi in the morning. Lights, food and music at night.",
      ],
      short:
        "Urban Forest is taking shape in Ipoh — a destination planned to keep the city alive from day into night. Local flavours, international cuisine, lights and night-time experiences in one connected place. Register to be first in line for the preview.",
      long:
        "Ipoh has the food, the heritage and the hills. What it has been missing is a place to go when the day ends. Urban Forest brings dining, entertainment and night-time experiences together in one planned destination by Team Keris Berhad (TKB). Book a private sales-gallery preview and see the plans up close.",
      headlines: ["Ipoh, Day into Night", "Ipoh's New After-Hours Address", "Where Ipoh Stays Up Late"],
    },
    bm: {
      hooks: [
        "Ipoh tidur awal. Tak lama lagi.",
        "Trip sehari selalu habis waktu senja. Bagaimana kalau tidak?",
        "Kopi di waktu pagi. Lampu, makanan dan hiburan di waktu malam.",
      ],
      short:
        "Urban Forest sedang dibangunkan di Ipoh — destinasi yang dirancang untuk menghidupkan bandar dari siang hingga malam. Juadah tempatan, masakan antarabangsa, cahaya lampu dan pengalaman malam dalam satu tempat. Daftar sekarang untuk pratonton awal.",
      long:
        "Ipoh ada makanan, warisan dan bukit-bukau. Yang kurang ialah tempat untuk dituju apabila hari berakhir. Urban Forest menghimpunkan tempat makan, hiburan dan pengalaman malam dalam satu destinasi terancang oleh Team Keris Berhad (TKB). Tempah pratonton peribadi di galeri jualan dan lihat pelannya dengan lebih dekat.",
      headlines: ["Ipoh, Siang ke Malam", "Destinasi Malam Baharu Ipoh", "Di Sini Ipoh Terus Hidup"],
    },
    zh: {
      hooks: ["怡保总是早早入睡？很快就不一样了。", "一日游总在日落时结束？这里不会。", "早上一杯白咖啡，晚上灯火、美食与欢乐。"],
      short:
        "Urban Forest 正在怡保成形——一个让城市从白天活跃到夜晚的新目的地。本地风味、国际美食、灯光与夜间体验，汇聚一处。立即登记，抢先预约参观。",
      long:
        "怡保有美食、有历史、有山水，唯独缺少一个日落后可以去的地方。Urban Forest 由 Team Keris Berhad（TKB）规划，把餐饮、娱乐与夜间体验连接成一个目的地。登记预约销售展厅私人参观，近距离了解规划。",
      headlines: ["怡保，从日到夜", "怡保夜生活新地标", "让怡保不再早睡"],
    },
  },
  planned: {
    en: {
      hooks: [
        "Most projects are built first and figured out later. This one wasn't.",
        "Before completion: the commercial mix, the traffic flow, the operating plan.",
        "We don't wait until completion and hope it works.",
      ],
      short:
        "At Urban Forest, the commercial mix, hospitality and attractions are planned as one connected ecosystem before construction completes — together with traffic flow and an operating strategy. TKB continues to manage the destination after opening. Book a private briefing to see the plan.",
      long:
        "Investors ask one question: will it work after handover? Urban Forest answers it before construction ends. Hospitality, F&B and attractions are planned as one ecosystem with the operating strategy in place, and TKB stays on to actively manage the destination after opening. Book a private briefing with our team to review the plan, the documents and the terms.",
      headlines: ["Planned to Perform", "Plan the Operation. Then Build.", "An Ecosystem, Not Just Units"],
    },
    bm: {
      hooks: [
        "Kebanyakan projek dibina dulu, difikir kemudian. Bukan yang ini.",
        "Sebelum siap: campuran komersial, aliran trafik, pelan operasi.",
        "Kami tidak tunggu siap dan berharap ia berjaya.",
      ],
      short:
        "Di Urban Forest, campuran komersial, hospitaliti dan tarikan dirancang sebagai satu ekosistem bersepadu sebelum pembinaan siap — lengkap dengan aliran trafik dan strategi operasi. TKB terus mengurus destinasi ini selepas dibuka. Tempah taklimat peribadi untuk melihat pelannya.",
      long:
        "Pelabur hanya ada satu soalan: adakah ia akan berjaya selepas penyerahan? Urban Forest menjawabnya sebelum pembinaan tamat. Hospitaliti, F&B dan tarikan dirancang sebagai satu ekosistem dengan strategi operasi tersedia, dan TKB kekal mengurus destinasi ini secara aktif selepas dibuka. Tempah taklimat peribadi bersama pasukan kami untuk meneliti pelan, dokumen dan terma.",
      headlines: ["Dirancang Untuk Berprestasi", "Rancang Operasi, Kemudian Bina", "Sebuah Ekosistem, Bukan Sekadar Unit"],
    },
    zh: {
      hooks: ["多数项目先建再想，这个不一样。", "竣工之前：商业组合、人流动线、营运计划，已经到位。", "我们不等竣工后才祈祷它成功。"],
      short:
        "Urban Forest 在竣工前，已将商业组合、酒店住宿与景点规划为一个互联的生态圈，并同步规划人流动线与营运策略。开业后，TKB 将持续积极管理。预约私人简报，了解完整规划。",
      long:
        "投资者最关心的只有一个问题：交屋后能否运作？Urban Forest 在竣工前就给出答案。酒店、餐饮与景点被规划为一个生态圈，营运策略提前到位，开业后 TKB 仍持续积极管理整个目的地。预约与我们团队的私人简报，详阅规划、文件与条款。",
      headlines: ["为营运而规划", "先规划营运，再动工兴建", "是生态圈，不只是单位"],
    },
  },
  food: {
    en: {
      hooks: [
        "128 eateries. No two alike.",
        "In Ipoh, no experience is complete without food.",
        "What happens when 128 eateries are curated with zero duplication?",
      ],
      short:
        "Urban Forest is curating 128 eateries without duplication — from familiar Ipoh flavours to international cuisine — so every visit offers something new. Register to preview the F&B plan.",
      long:
        "Ipoh is a food city. Urban Forest is planned around that truth: 128 eateries curated without duplication, from local delicacies to international cuisine, alongside entertainment and night-time experiences. For diners, more variety. For operators, less internal competition. Register to preview the plan or enquire about F&B opportunities.",
      headlines: ["128 Eateries. Zero Duplicates.", "Ipoh's Food Scene, Curated", "Local Flavours to World Cuisine"],
    },
    bm: {
      hooks: [
        "128 kedai makan. Tiada yang sama.",
        "Di Ipoh, tiada pengalaman lengkap tanpa makanan.",
        "Apa jadi bila 128 kedai makan dikurasi tanpa pertindihan?",
      ],
      short:
        "Urban Forest sedang mengkurasi 128 kedai makan tanpa pertindihan — daripada rasa Ipoh yang dikenali hingga masakan antarabangsa — supaya setiap kunjungan ada sesuatu yang baharu. Daftar untuk pratonton pelan F&B.",
      long:
        "Ipoh ialah bandar makanan. Urban Forest dirancang berdasarkan hakikat itu: 128 kedai makan dikurasi tanpa pertindihan, daripada juadah tempatan hingga masakan antarabangsa, bersama hiburan dan pengalaman malam. Bagi pengunjung, lebih banyak pilihan. Bagi pengusaha, kurang persaingan dalaman. Daftar untuk pratonton pelan atau bertanya tentang peluang F&B.",
      headlines: ["128 Kedai Makan. Tiada Pertindihan.", "Selera Ipoh, Dikurasi", "Juadah Tempatan ke Masakan Dunia"],
    },
    zh: {
      hooks: ["128家餐饮，家家不重复。", "在怡保，没有美食就不算完整的体验。", "当128家餐饮被精心策划、零重复，会是什么样子？"],
      short:
        "Urban Forest 精心策划128家餐饮、互不重复——从熟悉的怡保风味到国际美食，每次到访都有新发现。立即登记，抢先了解餐饮规划。",
      long:
        "怡保是美食之城。Urban Forest 正是围绕这一点规划：128家餐饮精心策划、互不重复，从地道小吃到国际料理，再加上娱乐与夜间体验。对食客来说，选择更多；对经营者来说，内部竞争更少。登记了解规划，或咨询餐饮商机。",
      headlines: ["128家餐饮 零重复", "精选怡保美食版图", "从地道风味到环球料理"],
    },
  },
  stay: {
    en: {
      hooks: [
        "Everyone visits Ipoh. Few stay the night.",
        "When the day's journey ends, where do visitors go?",
        "Theme stays, immersive spaces, and a reason to stay one more night.",
      ],
      short:
        "From theme stays and relaxing getaways to immersive spaces filled with stories and character, Urban Forest turns a stop in Ipoh into a stay. The accommodation suites are planned to be run by a professional hospitality operator. Book a sales-gallery visit to learn more.",
      long:
        "Ipoh draws visitors year after year for its landscapes, hospitality and food — then most of them drive home. Urban Forest is designed to give them a reason to stay: theme stays, relaxing getaways and immersive spaces, with the accommodation suites planned to be run by a professional hospitality operator. Book a private sales-gallery visit to see the layouts and the plan.",
      headlines: ["Give Ipoh a Reason to Stay", "From a Stop to a Stay", "Stay Longer in Ipoh"],
    },
    bm: {
      hooks: [
        "Semua orang singgah di Ipoh. Tak ramai yang bermalam.",
        "Bila perjalanan seharian berakhir, ke mana pengunjung pergi?",
        "Penginapan bertema, ruang imersif dan satu lagi sebab untuk bermalam.",
      ],
      short:
        "Daripada penginapan bertema dan percutian santai hingga ruang imersif yang penuh cerita dan karakter, Urban Forest menjadikan persinggahan di Ipoh satu penginapan. Suite penginapan dirancang untuk dikendalikan oleh pengendali hospitaliti profesional. Tempah lawatan galeri jualan untuk maklumat lanjut.",
      long:
        "Ipoh menarik pengunjung tahun demi tahun dengan pemandangan, layanan mesra dan makanannya — kemudian kebanyakan mereka pulang. Urban Forest direka untuk memberi mereka sebab untuk bermalam: penginapan bertema, percutian santai dan ruang imersif, dengan suite penginapan dirancang untuk dikendalikan oleh pengendali hospitaliti profesional. Tempah lawatan peribadi ke galeri jualan untuk melihat susun atur dan pelannya.",
      headlines: ["Beri Ipoh Sebab Untuk Bermalam", "Dari Singgah ke Menginap", "Lebih Lama di Ipoh"],
    },
    zh: {
      hooks: ["人人都来怡保，却很少人留下过夜。", "一天的旅程结束后，游客该去哪里？", "主题住宿、沉浸式空间，多留一晚的理由。"],
      short:
        "从主题住宿、休闲度假，到充满故事与个性的沉浸式空间，Urban Forest 让怡保不只是途经，而是停留。住宿套房计划由专业酒店营运商管理。预约参观销售展厅，了解更多。",
      long:
        "怡保每年吸引无数游客，欣赏山水、感受人情、品尝美食——然后大多数人当天就离开。Urban Forest 为他们创造留下的理由：主题住宿、休闲度假与沉浸式空间，住宿套房计划由专业酒店营运商管理。预约私人参观销售展厅，了解户型与规划。",
      headlines: ["给怡保一个留下的理由", "从途经到停留", "在怡保多留一晚"],
    },
  },
};

/** 5-card carousel scripts per angle (card copy is EN; the Copywriter localises per asset). */
export const carouselCards: Record<string, Record<Lang, string[]>> = {
  night: {
    en: ["Ipoh sleeps early.", "Not for much longer.", "Local flavours to world cuisine.", "Lights, music, night-time experiences.", "Urban Forest — book a preview."],
    bm: ["Ipoh tidur awal.", "Tak lama lagi.", "Juadah tempatan ke masakan dunia.", "Lampu, muzik, pengalaman malam.", "Urban Forest — tempah pratonton."],
    zh: ["怡保总是早睡。", "很快就不一样了。", "从本地风味到环球美食。", "灯光、音乐与夜间体验。", "Urban Forest——预约参观。"],
  },
  planned: {
    en: ["Built first, figured out later?", "Not here.", "Commercial mix planned before completion.", "Traffic flow + operating strategy in place.", "Managed by TKB after opening."],
    bm: ["Bina dulu, fikir kemudian?", "Bukan di sini.", "Campuran komersial dirancang sebelum siap.", "Aliran trafik + strategi operasi tersedia.", "Diurus oleh TKB selepas dibuka."],
    zh: ["先建再想？", "这里不是。", "竣工前已规划商业组合。", "人流动线与营运策略到位。", "开业后由 TKB 持续管理。"],
  },
  food: {
    en: ["128 eateries.", "No two alike.", "Familiar Ipoh flavours.", "International cuisine.", "Register to preview the F&B plan."],
    bm: ["128 kedai makan.", "Tiada yang sama.", "Rasa Ipoh yang dikenali.", "Masakan antarabangsa.", "Daftar untuk pratonton pelan F&B."],
    zh: ["128家餐饮。", "家家不重复。", "熟悉的怡保风味。", "多元国际美食。", "登记了解餐饮规划。"],
  },
  stay: {
    en: ["Everyone visits Ipoh.", "Few stay the night.", "Theme stays & getaways.", "Immersive spaces with character.", "A reason to stay — book a visit."],
    bm: ["Semua singgah di Ipoh.", "Tak ramai bermalam.", "Penginapan bertema & percutian.", "Ruang imersif berkarakter.", "Sebab untuk bermalam — tempah lawatan."],
    zh: ["人人都来怡保。", "很少人留下过夜。", "主题住宿与休闲度假。", "有个性的沉浸式空间。", "留下的理由——预约参观。"],
  },
};
