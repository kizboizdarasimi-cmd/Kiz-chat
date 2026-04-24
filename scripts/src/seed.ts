import {
  db,
  usersTable,
  videosTable,
  followsTable,
  notificationsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const DEMO_USERS = [
  {
    clerkId: "demo_zara",
    username: "zara",
    displayName: "Zara Vega",
    bio: "🌃 city lights, midnight beats, and choreography",
    profilePicture:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
    isVerified: true,
  },
  {
    clerkId: "demo_kai",
    username: "kai",
    displayName: "Kai Nakamura",
    bio: "skater · coffee · Tokyo nights",
    profilePicture:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    isVerified: true,
  },
  {
    clerkId: "demo_rio",
    username: "rio_eats",
    displayName: "Rio Eats",
    bio: "i'm just here for the food 🥢",
    profilePicture:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    isVerified: false,
  },
  {
    clerkId: "demo_nova",
    username: "novaftw",
    displayName: "Nova Park",
    bio: "indie producer · synth witch",
    profilePicture:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    isVerified: false,
  },
  {
    clerkId: "demo_milo",
    username: "milo",
    displayName: "Milo",
    bio: "yes, the dog 🐕 — handler is a human",
    profilePicture:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop",
    isVerified: false,
  },
  {
    clerkId: "demo_aria",
    username: "aria",
    displayName: "Aria Chen",
    bio: "thrift hauls + outfit tutorials. 22, NYC.",
    profilePicture:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    isVerified: false,
  },
];

const DEMO_VIDEOS = [
  {
    username: "zara",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1571266028243-d220c6a06fe5?w=540&h=960&fit=crop",
    caption: "first take of the new routine 🌙 #dance #night",
    likes: 1241,
  },
  {
    username: "kai",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1502780402662-acc01917cf6f?w=540&h=960&fit=crop",
    caption: "shibuya at 3am hits different",
    likes: 980,
  },
  {
    username: "rio_eats",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=540&h=960&fit=crop",
    caption: "the best ramen in this city — link in bio 🍜",
    likes: 2104,
  },
  {
    username: "nova",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=540&h=960&fit=crop",
    caption: "messing around with a new patch ✨",
    likes: 612,
  },
  {
    username: "milo",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=540&h=960&fit=crop",
    caption: "he learned a new trick 🐾",
    likes: 3540,
  },
  {
    username: "aria",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=540&h=960&fit=crop",
    caption: "thrifted this entire fit for under $30 👀",
    likes: 1876,
  },
  {
    username: "zara",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=540&h=960&fit=crop",
    caption: "mirror practice — feedback please ✨",
    likes: 720,
  },
  {
    username: "kai",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=540&h=960&fit=crop",
    caption: "landed it on the third try 🛹",
    likes: 1432,
  },
  {
    username: "nova",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=540&h=960&fit=crop",
    caption: "midnight drive vibes 🌌 — full track tomorrow",
    likes: 543,
  },
  {
    username: "rio_eats",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=540&h=960&fit=crop",
    caption: "homemade pasta from scratch 🍝",
    likes: 2890,
  },
];

async function main() {
  console.log("Seeding demo users…");
  const userIdByUsername = new Map<string, number>();

  for (const u of DEMO_USERS) {
    const existing = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.username} = ${u.username}`);
    if (existing.length > 0) {
      userIdByUsername.set(u.username, existing[0]!.id);
      continue;
    }
    const inserted = await db
      .insert(usersTable)
      .values({
        clerkId: u.clerkId,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        profilePicture: u.profilePicture,
        isVerified: u.isVerified,
      })
      .returning({ id: usersTable.id });
    userIdByUsername.set(u.username, inserted[0]!.id);
  }

  console.log("Seeding follow graph…");
  const usernames = DEMO_USERS.map((u) => u.username);
  for (const a of usernames) {
    for (const b of usernames) {
      if (a === b) continue;
      if (Math.random() > 0.4) continue;
      const aId = userIdByUsername.get(a)!;
      const bId = userIdByUsername.get(b)!;
      const exists = await db
        .select()
        .from(followsTable)
        .where(
          sql`${followsTable.followerId} = ${aId} AND ${followsTable.followingId} = ${bId}`,
        );
      if (exists.length === 0) {
        await db
          .insert(followsTable)
          .values({ followerId: aId, followingId: bId });
        await db
          .update(usersTable)
          .set({ followersCount: sql`${usersTable.followersCount} + 1` })
          .where(sql`${usersTable.id} = ${bId}`);
        await db
          .update(usersTable)
          .set({ followingCount: sql`${usersTable.followingCount} + 1` })
          .where(sql`${usersTable.id} = ${aId}`);
      }
    }
  }

  console.log("Seeding videos…");
  let i = 0;
  for (const v of DEMO_VIDEOS) {
    const userId = userIdByUsername.get(v.username);
    if (!userId) continue;
    const existing = await db
      .select()
      .from(videosTable)
      .where(
        sql`${videosTable.userId} = ${userId} AND ${videosTable.caption} = ${v.caption}`,
      );
    if (existing.length > 0) continue;
    await db.insert(videosTable).values({
      userId,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      caption: v.caption,
      likesCount: v.likes,
      commentsCount: Math.floor(v.likes / 30),
    });
    await db
      .update(usersTable)
      .set({
        videosCount: sql`${usersTable.videosCount} + 1`,
        likesCount: sql`${usersTable.likesCount} + ${v.likes}`,
      })
      .where(sql`${usersTable.id} = ${userId}`);
    i += 1;
  }

  console.log(`Seeded ${userIdByUsername.size} users, ${i} new videos.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
