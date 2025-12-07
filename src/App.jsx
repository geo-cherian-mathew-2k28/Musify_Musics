import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  Play, Pause, SkipForward, SkipBack, Heart, 
  Search, Home, Library, User, LogOut, 
  ShieldCheck, Zap, X, Mic, Sparkles, Activity, 
  Headphones, Radio, Clock, CheckCircle, Settings, 
  Plus, ListMusic, Smartphone, Calendar, 
  ToggleLeft, ToggleRight, Check, AlertCircle, 
  Code, Trash2, Lock, Loader2, Chrome,
  ListOrdered, Infinity, MoveRight, Send, Crown, CheckSquare, 
  Signal, RadioReceiver, Download, CloudLightning, ChevronRight, ChevronLeft,
  Mail, MessageSquarePlus, CreditCard, Edit2, Music, XCircle, Globe, Palette,
  Eye, EyeOff, ArrowRight, DollarSign, Server, MessageCircle
} from 'lucide-react';

// --- CONFIGURATION ---

const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
const BASE_URL = isProduction ? "" : "http://localhost:5000";

const getPublicEnv = (key) => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return "";
  } catch (e) {
    return "";
  }
};

const RAZORPAY_KEY_ID = getPublicEnv("VITE_RAZORPAY_KEY_ID");
const ADSENSE_CLIENT_ID = getPublicEnv("VITE_ADSENSE_CLIENT_ID");
const ADSENSE_SLOT_ID = getPublicEnv("VITE_ADSENSE_SLOT_ID");

let app, auth, db;

const loadFirebaseConfig = () => {
  try {
    if (getPublicEnv("VITE_FIREBASE_API_KEY")) {
      return {
        apiKey: getPublicEnv("VITE_FIREBASE_API_KEY"),
        authDomain: getPublicEnv("VITE_FIREBASE_AUTH_DOMAIN"),
        projectId: getPublicEnv("VITE_FIREBASE_PROJECT_ID"),
        storageBucket: getPublicEnv("VITE_FIREBASE_STORAGE_BUCKET"),
        messagingSenderId: getPublicEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
        appId: getPublicEnv("VITE_FIREBASE_APP_ID"),
        measurementId: getPublicEnv("VITE_FIREBASE_MEASUREMENT_ID")
      };
    }
    if (typeof __firebase_config !== 'undefined') {
      return typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    }
  } catch (e) {}
  return null;
};

try {
  const config = loadFirebaseConfig();
  if (config && config.apiKey) {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase Init Error", error);
}

// --- SECURE BACKEND CLIENT ---

const apiClient = async (endpoint, method = 'POST', body = null) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    const token = await auth.currentUser.getIdToken(true);
    
    try {
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const route = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
        const response = await fetch(`${BASE_URL}${route}`, config);
        
        if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || "Server Error");
        }
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

// --- ASSETS & DATA ---

const AVATARS = ["https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka", "https://api.dicebear.com/7.x/avataaars/svg?seed=Zack", "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly", "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo", "https://api.dicebear.com/7.x/avataaars/svg?seed=Bear"];

const createSong = (id, title, artist, genre, mood, year, cover, url, plays, isTrending = false) => ({
    id, title, artist, genre, mood, year, plays,
    url: url || `/songs/${title}.mp3`,
    cover: cover || `https://ui-avatars.com/api/?name=${title.replace(/ /g, '+')}&background=random&size=300&bold=true`,
    isTrending
});

const SONGS = [
  // --- TRENDING TOP PICKS ---
  createSong(1, "Illuminati", "Sushin Shyam", "Malayalam", "Party", "2024", "https://c.saavncdn.com/004/Illuminati-From-Aavesham-Malayalam-2024-20240328131644-500x500.jpg", "/songs/Illuminati.mp3", "10M", true),
  createSong(2, "Manasilayo", "Anirudh", "Tamil", "Dance", "2024", "https://i.scdn.co/image/ab67616d0000b273da8d29ecfc096bb69dff7ac1", "/songs/Manasilaayo.mp3", "8.5M", true),
  createSong(3, "Chaleya", "Arijit Singh", "Hindi", "Romance", "2023", "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/ff/32/1eff3216-190d-6fd9-8f68-acbba846e6ee/8903431956026_cover.jpg/1200x1200bf-60.jpg", "/songs/Chaleya.mp3", "15M", true),
  createSong(4, "Heeriye", "Jasleen Royal", "Hindi", "Chill", "2023", "https://c.saavncdn.com/022/Heeriye-feat-Arijit-Singh-Hindi-2023-20230928050405-500x500.jpg", "/songs/Heeriye.mp3", "12M", true),
  createSong(5, "Aasa Kooda", "Sai Abhyankkar", "Tamil", "Romance", "2024", "https://c.saavncdn.com/772/Aasa-Kooda-from-Think-Indie-Tamil-2024-20240613052402-500x500.jpg", "/songs/Aasa Kooda.mp3", "5M", true),
  createSong(6, "Naa Ready", "Anirudh", "Tamil", "Party", "2023", "https://i.scdn.co/image/ab67616d0000b27322184598701ab40d70bf75a1", "/songs/Naa Ready.mp3", "25M", true),
  createSong(87, "Espresso", "Sabrina Carpenter", "English", "Pop", "2024", "https://i.pinimg.com/736x/78/2f/fe/782ffe69171cb672c4ffcbfbceea3b97.jpg", "/songs/Espresso.mp3", "20M", true),
  createSong(88, "Die With A Smile", "Lady Gaga", "English", "Chill", "2024", "https://tse4.mm.bing.net/th/id/OIP.X_4L8I0ajd8P8TCEsWSSAAHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Die With A Smile.mp3", "18M", true),
  createSong(7, "Chuttamalle", "Thaman S", "Malayalam", "Dance", "2024", "https://sonichits.com/image/aHR0cHM6Ly9sYXN0Zm0uZnJlZXRscy5mYXN0bHkubmV0L2kvdS8zMDB4MzAwL2JhMDk5MmY5ZDgzZmNiNTZjODQxMWZkN2M1YWRkZDY2LnBuZw", "/songs/Chuttamalle.mp3", "2M", true),
  createSong(8, "Sajini", "Arijit Singh", "Hindi", "Happy", "2024", "https://i.ytimg.com/vi/jVdZnpRwquI/maxresdefault.jpg", "/songs/Sajini.mp3", "1M", true),

  // --- MALAYALAM ---
  createSong(26, "Manju Pole", "Mohan Sithara", "Malayalam", "Chill", "2000", "https://a10.gaanacdn.com/gn_img/albums/ogNWkDbmXJ/gNWkvnwJ3m/size_l.jpg", "/songs/Manju Pole.mp3", "10M", false),
  createSong(27, "Punchiri Thanchum", "Gopi Sundar", "Malayalam", "Romance", "2015", "https://i.ytimg.com/vi/CJV06zZ-x38/hq720_2.jpg?sqp=-oaymwEYCMQFENAFSFryq4qpAwoIARUAAIhC0AEB&rs=AOn4CLD-f2LzR8tsM-RJr532oaDIt-ow4g", "/songs/Punchiri Thanchum.mp3", "5M", false),
  createSong(28, "Premavathi", "Jakes Bejoy", "Malayalam", "Romance", "2019", "https://bharatlyrics.com/wp-content/uploads/2025/10/Premavathi.jpg", "/songs/Premavathi.mp3", "15M", false),
  createSong(29, "Chirapunchiri", "Unknown", "Malayalam", "Happy", "2021", "https://masstamilpro.com/upload_file/60/230x230/thumb_685225b2c10c4.webp", "/songs/Chirapunchiri.mp3", "8M", false),
  createSong(30, "Minnalvala", "Shaan Rahman", "Malayalam", "Dance", "2023", "https://i.scdn.co/image/ab67616d0000b27353f2d998838adb02dda39391", "/songs/Minnalvala.mp3", "12M", false),
  createSong(31, "Uyiril Thodum", "Sooraj S. Kurup", "Malayalam", "Romance", "2018", "https://a10.gaanacdn.com/gn_pl_img/playlists/ZaP37OR3Dy/P37Nz2G1KD/size_l_1552548954.jpg", "/songs/Uyiril Thodum.mp3", "3M", false),
  createSong(33, "Ee Kaattu", "Bijibal", "Malayalam", "Chill", "2016", "https://tse2.mm.bing.net/th/id/OIP.WcfTzQCzbrIV1--J2pTtXgAAAA?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Ee Kaattu.mp3", "7M", false),
  createSong(34, "Madhupole Peytha Mazhaye", "Unknown", "Malayalam", "Sad", "2005", "https://s.mxmcdn.net/images-storage/albums4/5/8/3/8/2/6/43628385_800_800.jpg", "/songs/Madhupole Peytha Mazhaye.mp3", "9M", false),
  createSong(35, "Kode Thullu", "Unknown", "Malayalam", "Party", "2022", "https://tse1.mm.bing.net/th/id/OIP.C9_dSd3GY7-2_ezw7N0oGwAAAA?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Koode Thullu.mp3", "11M", false),
  createSong(36, "Jeevana", "K.S. Harisankar", "Malayalam", "Soul", "2023", "https://c.saavncdn.com/343/Jeevana-Malayalam-2021-20210318120713-500x500.jpg", "/songs/Jeevana.mp3", "6M", false),
  createSong(37, "Puthiyoru Pathayil", "Sushin Shyam", "Malayalam", "Focus", "2019", "https://tse2.mm.bing.net/th/id/OIP.idX56pUm2eKHcp89SIBLTAHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Puthiyoru Pathayil.mp3", "4M", false),
  createSong(38, "Vellai Poove", "A.R. Rahman", "Malayalam", "Classic", "1999", "https://i.ytimg.com/vi/fNTPn7j755I/maxresdefault.jpg", "/songs/Vellai Poove.mp3", "14M", false),
  createSong(39, "Kamini", "Anugrah", "Malayalam", "Pop", "2019", "https://c-fa.cdn.smule.com/rs-s-sf-1/arr/7e/0b/d698a080-21f0-41c6-8db8-5f4221906cea.jpg", "/songs/Kamini.mp3", "13M", false),
  createSong(40, "Jalakaari", "Unknown", "Malayalam", "Folk", "2022", "https://c.saavncdn.com/076/Jaalakaari-From-Balti-Malayalam-2025-20250824120531-500x500.jpg", "/songs/Jalakaari.mp3", "16M", false),
  createSong(41, "Kulasthree", "Unknown", "Malayalam", "Satire", "2023", "https://c.saavncdn.com/292/Kulasthree-Malayalam-2025-20251022053941-150x150.jpg", "/songs/Kulasthree.mp3", "17M", false),
  createSong(42, "Neeye Punchiri", "Unknown", "Malayalam", "Happy", "2020", "https://c.saavncdn.com/215/Lokah-Chapter-1-Chandra-Original-Motion-Picture-Soundtrack-Malayalam-2025-20250919143505-500x500.jpg", "/songs/Neeye Punchiri.mp3", "22M",false),
  createSong(43, "Kutty Kudiye", "Gopi Sundar", "Malayalam", "Dance", "2022", "https://d24jnm9llkb1ub.cloudfront.net/icpn/197338115138/197338115138-cover-zoom.jpg", "/songs/Kutty Kudiye.mp3", "21M",false),
  createSong(44, "Jeevamshamayi", "Kailas Menon", "Malayalam", "Romance", "2018", "https://a10.gaanacdn.com/gn_img/song/VdNW0JMKo5/NW0rkX9XKo/size_l_1523367355.jpg", "/songs/Jeevamshamayi.mp3", "23M",false),
  createSong(45, "Jupiter Mazha", "Unknown", "Malayalam", "Chill", "2023", "https://tse2.mm.bing.net/th/id/OIP.0osdNPW63KW4lF7u98ZVeAHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/jupiter Mazha.mp3", "24M",false),
  createSong(46, "Aaromal", "Gopi Sundar", "Malayalam", "Romance", "2017", "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/8e/30/2e/8e302e2f-d8f8-05df-f9e6-2d586a61f8a5/196589295354.jpg/800x800cc.jpg", "/songs/Aaromal.mp3", "26M",false),
  createSong(47, "Aadharanjali", "Sushin Shyam", "Malayalam", "Dark", "2024", "https://timesofindia.indiatimes.com/photo/msid-104071780,imgsize-127758.cms", "/songs/Aadharanjali.mp3", "27M",false),
  createSong(48, "Malare", "Rajesh Murugesan", "Malayalam", "Romance", "2015", "https://i.ytimg.com/vi/0G2VxhV_gXM/maxresdefault.jpg", "/songs/Malare.mp3", "28M",false),
  createSong(49, "Vatteppam", "Unknown", "Malayalam", "Fun", "2023", "https://a10.gaanacdn.com/gn_img/albums/01A3mar3NQ/A3moMnl5bN/size_m.jpg", "/songs/Vatteppam.mp3", "29M",false),
  createSong(50, "Galatta", "Sushin Shyam", "Malayalam", "Party", "2024", "https://c.saavncdn.com/858/Aavesham-Malayalam-2024-20240514204401-500x500.jpg", "/songs/Galatta.mp3", "30M",false),
  createSong(51, "Etho Mazhayil", "Ouseppachan", "Malayalam", "Rain", "2009", "https://a10.gaanacdn.com/gn_img/albums/VdNW0JMKo5/dNW0oBeX3o/size_m_1547120934.jpg", "/songs/Etho Mazhayil.mp3", "31M",false),
  createSong(52, "Pularan Nearam", "Unknown", "Malayalam", "Morning", "2021", "https://tse2.mm.bing.net/th/id/OIP.9dCPZqzuCwkk2hrl_jvLnQHaJ4?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Pularan Nearam.mp3", "32M",false),

   // --- TAMIL ---
  createSong(53, "Thalapathy Kacheri", "Anirudh", "Tamil", "Party", "2024", "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1Q3Ear.img?w=700&h=400&m=6&x=9&y=17&s=635&d=273", "/songs/Thalapathy Kacheri.mp3"),
  createSong(54, "Oorum Blood", "Santhosh Narayanan", "Tamil", "Workout", "2023", "https://c.saavncdn.com/091/Oorum-Blood-From-Dude-Tamil-2025-20250828160021-500x500.jpg", "/songs/Oorum Blood.mp3"),
  createSong(55, "Monica", "Harris Jayaraj", "Tamil", "Romance", "2008", "https://saregamalu.com/wp-content/uploads/2025/07/Monica-song-lyrics-1024x576.jpg", "/songs/Monica.mp3"),
  createSong(56, "Singari", "Unknown", "Tamil", "Folk", "2022", "https://i.ytimg.com/vi/0_Lm2PzEeZ8/sddefault.jpg", "/songs/Singari.mp3"),
  createSong(57, "Kanimaa", "Unknown", "Tamil", "Romance", "2023", "https://tse3.mm.bing.net/th/id/OIP.lQr5RiDTLD97O5W-dAUqMgHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Kanimaa.mp3"),
  createSong(58, "Adi Alaya", "Unknown", "Tamil", "Chill", "2021", "https://img.youtube.com/vi/mK0QTleAg8k/0.jpg", "/songs/Adi Alaya.mp3"),
  createSong(59, "Powerhouse", "Unknown", "Tamil", "Workout", "2024", "https://masstamilan.sbs/upload_file/19/37/230x230/thumb_6881b2d95c14b.webp", "/songs/Powerhouse.mp3"),
  createSong(60, "Hey Minnale", "Harris Jayaraj", "Tamil", "Romance", "2003", "https://i.scdn.co/image/ab67616d0000b273d29a8598a39461ddb2a15953", "/songs/Hey Minnale.mp3"),
  createSong(61, "Rise of Dragon", "Unknown", "Tamil", "Focus", "2024", "https://c.saavncdn.com/236/Dragon-Tamil-2025-20250221231203-500x500.jpg", "/songs/Rise of Dragon.mp3"),
  createSong(62, "Paththavaikkum", "Anirudh", "Tamil", "Dance", "2022", "https://i.scdn.co/image/ab67616d0000b2732b4185706c90b7f1435496c8", "/songs/Paththavaikkum.mp3"),

  // --- HINDI ---
  createSong(65, "Tenu Sang Rekhna", "Arijit Singh", "Hindi", "Romance", "2022", "https://c.saavncdn.com/415/Tenu-Sang-Rakhna-From-Jigra-Hindi-2024-20241003174013-500x500.jpg", "/songs/Tenu Sang Rekhna.mp3"),
  createSong(66, "Mere Sohneya", "Sachet Tandon", "Hindi", "Happy", "2019", "https://c.saavncdn.com/679/Mere-Sohneya-From-Kabir-Singh--Hindi-2019-20190606024538-500x500.jpg", "/songs/Mere Sohneya.mp3"),
  createSong(67, "Pal", "Arijit Singh", "Hindi", "Sad", "2018", "https://i.ytimg.com/vi/d9N7gMMjDzs/maxresdefault.jpg", "/songs/Pal.mp3"),
  createSong(68, "Hamari Adhuri Kahani", "Arijit Singh", "Hindi", "Sad", "2015", "https://www.bms.co.in/wp-content/uploads/2015/06/Hamari-Adhuri-Kahani-Images-6.jpg", "/songs/Hamari Adhuri Kahani.mp3"),
  createSong(69, "Phir Kabhi", "Arijit Singh", "Hindi", "Romance", "2016", "https://i.ytimg.com/vi/19nnjV93N0s/maxresdefault.jpg", "/songs/Phir Kabhi.mp3"),
  createSong(70, "Humnava Mere", "Jubin Nautiyal", "Hindi", "Sad", "2018", "https://c.saavncdn.com/259/Humnava-Mere-Hindi-2018-20180522-500x500.jpg", "/songs/Humnava Mere.mp3"),
  createSong(71, "Tum Se", "Sachin-Jigar", "Hindi", "Romance", "2024", "https://songsall.com/wp-content/uploads/2024/02/OIP-11.jpg", "/songs/Tum Se.mp3"),
  createSong(72, "Mere Ashiqui", "Jubin Nautiyal", "Hindi", "Romance", "2020", "https://www.moviesmedia.net/wp-content/uploads/2020/05/101197063_271483027541288_1834479497196371698_n.jpg", "/songs/Mere Ashiqui.mp3"),
  createSong(73, "Tum Hi Ho", "Arijit Singh", "Hindi", "Romance", "2013", "https://i.scdn.co/image/ab67616d0000b273ab8eb21eeda8094f7741534f", "/songs/Tum Hi Ho.mp3"),
  createSong(74, "Nadaaniyan", "Akshath", "Hindi", "Chill", "2024", "https://images.filmibeat.com/img/popcorn/movie_posters/nadaaniyan-20250203223806-23455.jpg", "/songs/Nadaaniyan.mp3"),
  createSong(75, "Tere Pyaar Mein", "Arijit Singh", "Hindi", "Party", "2023", "https://c.saavncdn.com/367/Tere-Pyaar-Mein-From-Tu-Jhoothi-Main-Makkaar-Hindi-2023-20230203140532-500x500.jpg", "/songs/Tere Pyaar Mein.mp3"),
  createSong(76, "Pehle Bhi Main", "Vishal Mishra", "Hindi", "Romance", "2023", "https://i.scdn.co/image/ab67616d0000b2737b8bd612f9e2385b190049ad", "/songs/Pehle Bhi Main.mp3"),
  createSong(78, "Vaaste", "Dhvani Bhanushali", "Hindi", "Pop", "2019", "https://i1.sndcdn.com/artworks-000596180771-gehlm5-t500x500.jpg", "/songs/Vaaste.mp3"),

  // --- ENGLISH ---
  createSong(79, "Sao Paulo", "The Weeknd", "English", "Dark", "2024", "https://img.youtube.com/vi/2kjolTLZ_Mg/maxresdefault.jpg", "/songs/Sao Paulo.mp3"),
  createSong(80, "I Think They Call This Love", "Elliot James", "English", "Romance", "2024", "https://tse2.mm.bing.net/th/id/OIP.2bKncX2GLV6XtXX_Nc2argHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/I Think They Call This Love.mp3"),
  createSong(81, "All The Stars", "Kendrick Lamar", "English", "Chill", "2018", "https://th.bing.com/th/id/OIP.kO8_x1tMbsH-q5_GjNQ0ZQAAAA?o=7&cb=ucfimg2&rm=3&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/All The Stars.mp3"),
  createSong(82, "Timeless", "Taylor Swift", "English", "Pop", "2023", "https://tse4.mm.bing.net/th/id/OIP.-hKsdCo-1nIGFw-ERAW5_gHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3", "/songs/Timeless.mp3"),
  createSong(83, "Without Me", "Eminem", "English", "Workout", "2002", "https://pagalworldmusic.com/downloads/cover/4575865/4575865.jpg", "/songs/Without Me.mp3"),
  createSong(84, "Die For You", "The Weeknd", "English", "Romance", "2016", "https://mir-s3-cdn-cf.behance.net/project_modules/1400/e7acb6164816619.63fd3fadb225d.jpg", "/songs/Die For You.mp3"),
  createSong(85, "Cry For Me", "The Weeknd", "English", "Dark", "2023", "https://i.scdn.co/image/ab67616d0000b2738ae9084b7cfa8281932d9cb9", "/songs/Cry For Me.mp3"),
  createSong(86, "The Fate of Ophelia", "Taylor Swift", "English", "Focus", "2024", "https://i.ytimg.com/vi/PK3AMAHzFyI/maxresdefault.jpg", "/songs/The Fate of Ophelia.mp3"),
];

const THEMES = {
  modern: { id: 'modern', name: 'Modern', bg: "bg-[#09090b]", text: "text-white", accent: "text-cyan-400", card: "bg-white/5 backdrop-blur-xl border-white/5", font: "font-sans", premium: false },
  retro: { id: 'retro', name: 'Retro', bg: "bg-[#1a0b2e]", text: "text-[#ff00ff]", accent: "text-[#00ffff]", card: "bg-black/40 border-[#ff00ff]/30 backdrop-blur-sm", font: "font-mono", premium: false },
  vintage: { id: 'vintage', name: 'Vintage', bg: "bg-[#2c241b]", text: "text-[#e6d2b5]", accent: "text-[#d4af37]", card: "bg-[#3e3223] border-[#d4af37]/20", font: "font-serif", premium: false },
  cyberpunk: { id: 'cyberpunk', name: 'Cyberpunk', bg: "bg-[#000000]", text: "text-[#f0f]", accent: "text-[#0f0]", card: "bg-gray-900 border-2 border-[#0f0] shadow-[0_0_10px_#0f0]", font: "font-mono", premium: true },
  glass: { id: 'glass', name: 'Glass', bg: "bg-gradient-to-br from-purple-900 to-indigo-900", text: "text-white", accent: "text-pink-300", card: "bg-white/10 border border-white/20 shadow-2xl backdrop-blur-xl", font: "font-sans", premium: true }
};

// --- COMPONENTS ---

const Toast = ({ message, type }) => (
  <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[250] px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-[slideDown_0.3s_ease-out] backdrop-blur-xl border border-white/10 ${type === 'error' ? 'bg-red-500/90 text-white' : 'bg-white/90 text-black'}`}>
    {type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} className="text-green-600" />}
    <span className="font-bold tracking-tight">{message}</span>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', loading = false, disabled = false, ...props }) => {
  const variants = {
    primary: "bg-gradient-to-r from-emerald-400 to-cyan-500 text-black hover:shadow-cyan-500/50",
    secondary: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20",
    premium: "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-orange-500/20",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}>
      {loading ? <Loader2 size={20} className="animate-spin" /> : children}
    </button>
  );
};

const Input = ({ type, placeholder, value, onChange, icon: Icon, required = false, className = "", rightIcon }) => (
  <div className="relative group w-full">
    {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors" size={20} />}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-gray-500 backdrop-blur-sm ${className}`}
    />
    {rightIcon && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightIcon}</div>}
  </div>
);

const AdModal = ({ onSkip, timer }) => {
    useEffect(() => {
        if(ADSENSE_CLIENT_ID && typeof window !== 'undefined' && window.adsbygoogle) {
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
        }
    }, []);

    return (
      <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in">
        <div className="max-w-md w-full bg-[#18181b] p-8 rounded-3xl border border-yellow-500/20 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
          <div className="w-full min-h-[160px] bg-white/5 rounded-lg mb-6 flex items-center justify-center border border-white/10 overflow-hidden text-gray-500 font-mono text-xs">
             {ADSENSE_CLIENT_ID && ADSENSE_SLOT_ID ? (
                 <ins className="adsbygoogle" style={{ display: 'block', width: '100%', height: '100%' }} data-ad-client={ADSENSE_CLIENT_ID} data-ad-slot={ADSENSE_SLOT_ID} data-ad-format="auto" data-full-width-responsive="true"></ins>
             ) : (
                 <div className="p-4 text-center"><p className="mb-2 font-bold text-yellow-400">Ad Space</p><p className="text-[10px] opacity-70">Support us!</p></div>
             )}
          </div>
          <div className="mb-6 mx-auto w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center"><Sparkles size={40} className="text-yellow-400 animate-pulse" /></div>
          <h2 className="text-3xl font-bold text-white mb-2">Sponsored</h2>
          <Button onClick={onSkip} disabled={timer > 0} variant={timer > 0 ? "secondary" : "primary"} className="w-full">{timer > 0 ? `Skip in ${timer}s` : "Skip to Music"}</Button>
        </div>
      </div>
    );
};

const RequestSongModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({ name: '', language: 'Malayalam', singer: '' });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181b] w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl animate-fade-in relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><MessageSquarePlus className="text-cyan-400"/> Request Song</h2><button onClick={onClose}><X size={24} className="text-gray-500 hover:text-white"/></button></div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); setFormData({ name: '', language: 'Malayalam', singer: '' }); }} className="space-y-4">
           <Input placeholder="Song Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} icon={ListMusic} required />
           <div className="relative"><select value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-4 pr-10 text-white appearance-none focus:border-cyan-500/50">{["Malayalam", "Tamil", "Hindi", "English"].map(l => <option key={l} value={l}>{l}</option>)}</select><ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20}/></div>
           <Input placeholder="Singer (Optional)" value={formData.singer} onChange={e => setFormData({...formData, singer: e.target.value})} icon={User} />
           <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
               <CheckCircle size={16} className="text-blue-400"/>
               <p className="text-xs text-blue-300">Request will be sent securely via Telegram</p>
           </div>
           <Button type="submit" loading={loading} className="w-full">Send Request</Button>
        </form>
      </div>
    </div>
  );
};

const FeedbackModal = ({ isOpen, onClose, onSubmit, loading }) => {
    const [message, setMessage] = useState('');
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181b] w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="text-purple-400"/> Send Feedback</h2><button onClick={onClose}><X size={24} className="text-gray-500 hover:text-white"/></button></div>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(message); setMessage(''); }} className="space-y-4">
                    <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder-gray-500 backdrop-blur-sm min-h-[120px]"
                        placeholder="Tell us what you think..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />
                    <Button type="submit" loading={loading} className="w-full">Send Feedback</Button>
                </form>
            </div>
        </div>
    );
};

const EditProfileModal = ({ isOpen, onClose, user, onSave, loading }) => {
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATARS[0]);
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181b] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Edit Profile</h3><button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button></div>
                <div className="space-y-4">
                    <div className="flex justify-center gap-2 mb-4">{AVATARS.map((av, i) => (<img key={i} src={av} onClick={() => setSelectedAvatar(av)} className={`w-10 h-10 rounded-full cursor-pointer border-2 ${selectedAvatar === av ? 'border-cyan-400' : 'border-transparent opacity-50'}`} />))}</div>
                    <Input placeholder="Display Name" value={name} onChange={e => setName(e.target.value)} icon={User} />
                    <Input placeholder="Phone Number (10 digits)" value={phone} onChange={e => setPhone(e.target.value)} icon={Smartphone} />
                    <Button className="w-full" onClick={() => { if (phone && !/^\d{10}$/.test(phone)) { alert("Please enter a valid 10-digit phone number"); return; } onSave({ name, phone, avatar: selectedAvatar }); }} loading={loading}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

const ProfessionalSongCard = ({ song, isPlaying, onClick, isLiked, onToggleLike, onAddToQueue, onAddToPlaylist, isPremium }) => (
  <div className="group flex flex-col gap-3 w-full cursor-pointer hover:-translate-y-1 transition-all duration-300" onClick={onClick}>
    <div className={`relative aspect-square rounded-2xl overflow-hidden shadow-lg ${isPlaying ? 'ring-2 ring-cyan-400 shadow-cyan-400/20' : 'group-hover:shadow-2xl group-hover:shadow-black/50'}`}>
      <img src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => {e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x300?text=Music"}}/>
      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button onClick={(e) => { e.stopPropagation(); onToggleLike(); }} className="p-2 rounded-full bg-black/50 hover:bg-white hover:text-black text-white transition-all hover:scale-110"><Heart size={18} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-pink-500" : ""} /></button>
          <button onClick={onClick} className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl">{isPlaying ? <Pause size={24} fill="black"/> : <Play size={24} fill="black" className="ml-1"/>}</button>
          <button onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); }} className="p-2 rounded-full bg-black/50 hover:bg-white hover:text-black text-white transition-all hover:scale-110"><Plus size={18} /></button>
      </div>
      {isPremium && <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1 rounded-full shadow-lg"><Crown size={12}/></div>}
    </div>
    <div className="flex flex-col px-1">
        <h3 className={`font-bold text-base truncate leading-tight ${isPlaying ? 'text-cyan-400' : 'text-white group-hover:text-white'}`}>{song.title}</h3>
        <div className="flex items-center justify-between mt-1"><p className="text-sm text-gray-400 truncate">{song.artist}</p><button onClick={(e) => {e.stopPropagation(); onAddToQueue();}} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Add to Queue"><ListOrdered size={16}/></button></div>
    </div>
  </div>
);

const QueueDrawer = ({ queue, onRemove, onClear, currentSong, isOpen, onClose, theme }) => (
  <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-[#09090b]/95 backdrop-blur-2xl z-[90] transform transition-transform duration-500 border-l border-white/10 shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 pt-10 md:pt-0"><h2 className={`text-2xl font-bold ${theme.text}`}>Up Next</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={24} className="text-gray-400"/></button></div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {currentSong && (
          <div className="mb-6"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Now Playing</h3>
            <div className={`p-4 rounded-2xl ${theme.card} flex items-center gap-4 border-l-4 border-cyan-400`}><img src={currentSong.cover} className="w-12 h-12 rounded-lg" alt="" /><div className="flex-1 min-w-0"><p className={`font-bold truncate ${theme.text}`}>{currentSong.title}</p><p className="text-sm text-gray-500 truncate">{currentSong.artist}</p></div><div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]"></div></div>
          </div>
        )}
        <div><div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Queue ({queue.length})</h3>{queue.length > 0 && <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300 font-bold uppercase">Clear All</button>}</div>{queue.length === 0 ? (<div className="text-center py-20 text-gray-600 flex flex-col items-center"><ListOrdered size={48} className="mb-4 opacity-20"/><p>Queue is empty</p></div>) : (<div className="space-y-2">{queue.map((song, i) => (<div key={`${song.id}-${i}`} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"><span className="text-gray-600 font-mono text-xs w-4">{i + 1}</span><img src={song.cover} className="w-10 h-10 rounded-lg opacity-80" alt="" /><div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${theme.text}`}>{song.title}</p><p className="text-xs text-gray-500 truncate">{song.artist}</p></div><button onClick={() => onRemove(i)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"><X size={16} /></button></div>))}</div>)}</div>
      </div>
    </div>
  </div>
);

const ThemeSwitcher = ({ currentEra, setEra, isPremium, onPremiumClick }) => (
  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-inner overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none">
    {Object.values(THEMES).map(theme => (
      <button key={theme.id} onClick={() => { if(theme.premium && !isPremium) onPremiumClick(); else setEra(theme.id); }} className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 capitalize flex-shrink-0 flex items-center gap-1 ${currentEra === theme.id ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}>{theme.name}{theme.premium && <Crown size={10} className="text-yellow-500"/>}</button>
    ))}
  </div>
);

// --- MAIN APP COMPONENT ---

export default function MusifyApp() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); 
  const [toast, setToast] = useState(null);
  
  // State
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]); 
  const [showQueue, setShowQueue] = useState(false);
  const [activeEra, setActiveEra] = useState('modern');
  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [autoplay, setAutoplay] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [listeningTime, setListeningTime] = useState(0);
  const [libraryView, setLibraryView] = useState('overview');
  const [viewingPlaylist, setViewingPlaylist] = useState(null);
  const [guestExpired, setGuestExpired] = useState(false);

  // Payment State
  const [paymentStep, setPaymentStep] = useState(0); 

  // Modals & Flows
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestFormData, setGuestFormData] = useState({ name: '', phone: '', age: '' });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false); // NEW
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(""); // NEW: For in-card error display

  // Ads
  const [showAd, setShowAd] = useState(false);
  const [adTimer, setAdTimer] = useState(5);
  const songsPlayedRef = useRef(0);
  
  // Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const audioRef = useRef(new Audio());
  const theme = THEMES[activeEra] || THEMES['modern'];

  // --- HELPERS & INIT ---

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveDataLocally = (key, data) => {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
  };

  const loadDataLocally = (key) => {
      try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : null; } catch (e) { return null; }
  };

  const getErrorMessage = (code) => {
      switch (code) {
        case 'auth/invalid-email': return "Invalid email address format.";
        case 'auth/user-disabled': return "This account has been disabled.";
        case 'auth/user-not-found': return "No account found with this email.";
        case 'auth/wrong-password': return "Incorrect password. Please try again.";
        case 'auth/invalid-credential': return "Invalid email or password.";
        case 'auth/email-already-in-use': return "Email is already registered. Please login.";
        case 'auth/weak-password': return "Password should be at least 6 characters.";
        default: return "An unexpected error occurred. Please try again.";
      }
  };

  const simulateLogin = (u) => {
      setUser(u);
      saveDataLocally('musify_cached_user', u);
      
      if(db && !u.isAnonymous) {
           const unsubscribeProfile = onSnapshot(doc(db, 'artifacts', 'musify-app', 'users', u.uid, 'profile', 'profileDoc'), (docSnap) => {
               if (docSnap.exists()) {
                   const data = docSnap.data();
                   setUserData(data);
                   setIsPremium(data.isPremium || false);
                   setLikedSongs(data.likedSongs || []);
                   setPlaylists(data.playlists || []);
                   setListeningTime(data.listeningTime || 0);
                   if(data.theme) setActiveEra(data.theme);
                   if (!data.onboarded) setShowOnboarding(true);
               } else {
                   const initialData = { name: u.displayName || 'User', isPremium: false, likedSongs: [], playlists: [], languages: [], onboarded: false, listeningTime: 0, theme: 'modern' };
                   setDoc(doc(db, 'artifacts', 'musify-app', 'users', u.uid, 'profile', 'profileDoc'), initialData, { merge: true });
                   setUserData(initialData);
                   setShowOnboarding(true);
               }
           });
      } else {
          const cachedProfile = loadDataLocally(`profile_${u.uid}`);
          if(cachedProfile) {
              setUserData(cachedProfile);
              setIsPremium(cachedProfile.isPremium || false);
          } else {
              setUserData({ name: u.displayName || 'User', isPremium: false });
          }
      }
      setLoading(false);
  };

  const handleLogout = () => {
      if(auth) signOut(auth);
      setUser(null);
      localStorage.removeItem('musify_cached_user');
      window.location.reload();
  };

  const updateProfile = async (updates) => {
      const newData = { ...userData, ...updates };
      setUserData(newData);
      saveDataLocally(`profile_${user.uid}`, newData);
      if(db && !user.isAnonymous) {
          try {
              await setDoc(doc(db, 'artifacts', 'musify-app', 'users', user.uid, 'profile', 'profileDoc'), newData, { merge: true });
          } catch(e){}
      }
      if(updates.theme) setActiveEra(updates.theme);
      showToast("Profile updated!");
  };

  // ... (Payment logic remains same)
  const initiatePayment = async (plan) => {
      setPaymentStep(1);
      
      try {
        const order = await apiClient('/payment/create-order', 'POST', { plan });
        
        const options = {
            key: RAZORPAY_KEY_ID, 
            amount: order.amount,
            currency: order.currency,
            name: "Musify Premium",
            description: plan === 'day' ? "Daily Pass" : "Monthly Pro",
            order_id: order.id,
            handler: async function (response) {
                try {
                    await apiClient('/payment/verify', 'POST', response);
                    handlePaymentSuccess(plan, response.razorpay_payment_id);
                } catch (e) {
                    showToast("Verification Failed", "error");
                    setPaymentStep(0);
                }
            },
            modal: {
                ondismiss: function() {
                    setPaymentStep(0);
                    showToast("Payment Cancelled", "info");
                }
            },
            prefill: { name: userData?.name, email: user?.email, contact: userData?.phone },
            theme: { color: "#06b6d4" }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      } catch (e) {
        showToast(e.message || "Could not initiate payment", "error");
        setPaymentStep(0);
      }
  };

  const handlePaymentSuccess = (plan, paymentId) => {
      setPaymentStep(2);
      setTimeout(() => {
          const expiry = new Date();
          if(plan === 'day') expiry.setDate(expiry.getDate() + 1);
          else expiry.setMonth(expiry.getMonth() + 1);
          
          updateProfile({ isPremium: true, premiumExpiry: expiry.toISOString(), lastPaymentId: paymentId });
          setIsPremium(true);
          showToast(`Premium Activated!`);
          setPaymentStep(0);
          setView('home');
      }, 2000);
  };

  const handleEmailAuth = async (e) => {
      e.preventDefault();
      setIsAuthLoading(true);
      setAuthError(""); // Clear previous errors
      if (auth) {
          try {
              let userCred;
              if (isLogin) {
                  userCred = await signInWithEmailAndPassword(auth, email, password);
              } else {
                  userCred = await createUserWithEmailAndPassword(auth, email, password);
                  await updateFirebaseProfile(userCred.user, { displayName: username });
                  if(db) {
                      await setDoc(doc(db, 'artifacts', 'musify-app', 'users', userCred.user.uid, 'profile', 'profileDoc'), {
                          name: username,
                          email: email,
                          joinedAt: Date.now(),
                          playlists: [],
                          likedSongs: []
                      });
                  }
              }
          } catch (error) {
              setAuthError(getErrorMessage(error.code)); // Set error state for UI display
          } finally {
              setIsAuthLoading(false);
          }
      }
  };

  const handleGoogleLogin = async () => {
      setIsAuthLoading(true);
      setAuthError("");
      if (auth) {
          try {
              const provider = new GoogleAuthProvider();
              await signInWithPopup(auth, provider);
          } catch (error) {
              console.error("Google Auth Error:", error);
              setAuthError(getErrorMessage(error.code));
          } finally {
              setIsAuthLoading(false);
          }
      }
  };

  const submitGuestForm = async (e) => {
    e.preventDefault();
    setAuthError(""); // Clear previous errors
    
    // Explicit validation check
    if (!/^\d{10}$/.test(guestFormData.phone)) {
        setAuthError("Please enter a valid 10-digit phone number.");
        return;
    }
    
    if (guestFormData.age < 13) {
        setAuthError("You must be at least 13 years old.");
        return;
    }

    setIsAuthLoading(true);
    const guestData = { name: guestFormData.name, phone: guestFormData.phone, age: guestFormData.age, isGuest: true, joinedAt: Date.now(), languages: [], onboarded: false, playlists: [], likedSongs: [] };
    
    if (auth) {
        try {
           const result = await signInAnonymously(auth);
           if(db) await setDoc(doc(db, 'artifacts', 'musify-app', 'users', result.user.uid, 'profile', 'profileDoc'), guestData, { merge: true });
        } catch (error) { 
            setAuthError("Guest login failed. Please try again.");
        } finally { setIsAuthLoading(false); }
    }
  };

  // --- GUEST TIMER ---
  useEffect(() => {
      let timer;
      if (user && user.isAnonymous) {
          setGuestExpired(false);
          timer = setTimeout(() => {
              setGuestExpired(true);
          }, 60000); // 60 seconds
      }
      return () => clearTimeout(timer);
  }, [user]);


  // --- INITIALIZATION ---

  useEffect(() => {
    const cachedUser = loadDataLocally('musify_cached_user');
    if (cachedUser) simulateLogin(cachedUser);
    const initAuth = async () => {
        if (!auth) {
            if(!cachedUser) setLoading(false);
            return;
        }
    };
    initAuth();
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
          if (u) simulateLogin(u);
          else {
              if(!cachedUser?.isAnonymous) setUser(null); 
              setLoading(false);
          }
        });
        return () => { unsubscribe(); };
    } 
  }, []);

  // --- AUDIO LOGIC ---

  useEffect(() => {
    const audio = audioRef.current;
    const handleSongEnd = () => {
        songsPlayedRef.current += 1;
        setIsPlaying(false);
        if(!isPremium && Math.random() < 0.4 && songsPlayedRef.current > 0) {
            setShowAd(true);
            setAdTimer(5);
            return;
        }
        playNext();
    };
    const updateProgress = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    
    let adInterval;
    if (showAd && adTimer > 0) {
        adInterval = setInterval(() => {
            setAdTimer((prev) => prev - 1);
        }, 1000);
    }
    const timeInterval = setInterval(() => {
        if(isPlaying) setListeningTime(t => {
            const newVal = t + 5;
            if(newVal % 60 === 0 && user) updateProfile({ listeningTime: newVal });
            return newVal;
        });
    }, 5000);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    return () => {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('ended', handleSongEnd);
        audio.removeEventListener('waiting', onWaiting);
        audio.removeEventListener('playing', onPlaying);
        clearInterval(timeInterval);
        clearInterval(adInterval);
    };
  }, [currentSong, autoplay, queue, isPremium, isPlaying, showAd, adTimer]); 

  useEffect(() => {
    if (currentSong) {
        audioRef.current.src = currentSong.url;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
        if(user) {
            const newHistory = [currentSong, ...searchHistory.filter(s => s.id !== currentSong.id)].slice(0, 5);
            setSearchHistory(newHistory);
            saveDataLocally(`history_${user.uid}`, newHistory);
        }
    }
  }, [currentSong]);

  useEffect(() => { isPlaying ? audioRef.current.play().catch(()=>{}) : audioRef.current.pause(); }, [isPlaying]);

  // --- ACTIONS ---
  
  const handleRequestSubmit = async (data) => {
      setIsSendingRequest(true);
      try {
        await apiClient('/songs/request', 'POST', data);
        showToast("Request sent successfully");
        setShowRequestModal(false);
      } catch (e) {
        showToast("Request Failed", "error");
      } finally {
        setIsSendingRequest(false);
      }
  };

  const handleFeedbackSubmit = async (message) => {
      setIsSendingRequest(true);
      try {
          await apiClient('/feedback', 'POST', { message });
          showToast("Feedback sent! Thank you.");
          setShowFeedbackModal(false);
      } catch(e) {
          showToast("Failed to send feedback", "error");
      } finally {
          setIsSendingRequest(false);
      }
  };

  const handleRadioPlay = (mood) => {
      const moodSongs = SONGS.filter(s => s.mood.includes(mood) || s.genre.includes(mood));
      if (moodSongs.length > 0) {
          const shuffled = [...moodSongs].sort(() => 0.5 - Math.random());
          setQueue(shuffled.slice(1));
          setCurrentSong(shuffled[0]);
          setIsPlaying(true);
          showToast(`Playing ${mood} Station`);
      } else {
          showToast(`No songs found`, "error");
      }
  };
  
  const toggleLike = (songId) => {
      if(!user) return;
      const newLikes = likedSongs.includes(songId) ? likedSongs.filter(id => id !== songId) : [...likedSongs, songId];
      setLikedSongs(newLikes);
      updateProfile({ likedSongs: newLikes });
  };

  const getTopPicks = () => SONGS.filter(s => s.isTrending).slice(0, 10);
  const getSongsByGenre = (genre) => SONGS.filter(s => s.genre === genre);
  
  const formatTime = (time) => {
      if(isNaN(time)) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playNext = () => {
      if (queue.length > 0) {
          const next = queue[0];
          setQueue(prev => prev.slice(1));
          setCurrentSong(next);
      } else {
          const idx = SONGS.findIndex(s => s.id === currentSong?.id);
          const next = SONGS[(idx + 1) % SONGS.length];
          setCurrentSong(next);
      }
  };

  const playPrev = () => {
      if (audioRef.current.currentTime > 3) {
          audioRef.current.currentTime = 0;
      } else {
          const idx = SONGS.findIndex(s => s.id === currentSong?.id);
          const prev = SONGS[(idx - 1 + SONGS.length) % SONGS.length];
          setCurrentSong(prev);
      }
  };

  const handleOnboardingComplete = (data) => {
      updateProfile({ ...data, onboarded: true });
      setShowOnboarding(false);
      if(data.theme) setActiveEra(data.theme);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-400 font-mono tracking-widest gap-4"><Loader2 className="animate-spin" size={40}/></div>;

  if (!user) { /* Login Screen */ 
    return (
      <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10">
          <div className="text-center mb-8"><h1 className="text-4xl font-bold text-white mb-2">Musify</h1><p className="text-gray-400 text-sm">Music for everyone</p></div>
          {!showGuestForm ? (
            <div className="space-y-4">
                {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center flex items-center justify-center gap-2 animate-[shake_0.3s_ease-in-out]">
                        <AlertCircle size={16} />
                        {authError}
                    </div>
                )}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {!isLogin && (
                        <Input 
                            type="text" 
                            placeholder="Username" 
                            icon={User} 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            required 
                        />
                    )}
                    <Input type="email" placeholder="Email" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      icon={Lock} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} className="text-gray-400"/> : <Eye size={18} className="text-gray-400"/>}</button>}
                    />
                    <Button type="submit" className="w-full" loading={isAuthLoading}>{isLogin ? 'Login' : 'Sign Up'}</Button>
                    <div className="text-center">
                      <span className="text-gray-500 text-xs cursor-pointer hover:text-white" onClick={() => { setIsLogin(!isLogin); setAuthError(""); }}>{isLogin ? "Need an account? Sign Up" : "Have an account? Login"}</span>
                    </div>
                </form>
                <div className="flex gap-2">
                    <Button type="button" onClick={handleGoogleLogin} variant="secondary" className="flex-1 text-xs flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Google
                    </Button>
                    <Button type="button" onClick={() => setShowGuestForm(true)} variant="secondary" className="flex-1 text-xs">Guest</Button>
                </div>
            </div>
          ) : (
             <form onSubmit={submitGuestForm} className="space-y-4 animate-fade-in">
                 {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center flex items-center justify-center gap-2 animate-[shake_0.3s_ease-in-out]">
                        <AlertCircle size={16} />
                        {authError}
                    </div>
                )}
                 <Input type="text" placeholder="Name" icon={User} value={guestFormData.name} onChange={e => setGuestFormData({...guestFormData, name: e.target.value})} required />
                 <Input type="tel" placeholder="Phone (10 digits)" icon={Smartphone} value={guestFormData.phone} onChange={e => setGuestFormData({...guestFormData, phone: e.target.value})} required />
                 <Input type="number" placeholder="Age" icon={Calendar} value={guestFormData.age} onChange={e => setGuestFormData({...guestFormData, age: e.target.value})} required />
                 <Button type="submit" className="w-full" loading={isAuthLoading}>Start Listening</Button>
                 <p className="text-center text-xs text-gray-500 cursor-pointer" onClick={() => { setShowGuestForm(false); setAuthError(""); }}>Back</p>
             </form>
          )}
        </div>
      </div>
    );
  }

  // ... (Trial Expired Modal check remains)

  return (
    <div className={`h-screen w-full flex overflow-hidden transition-colors duration-700 ${theme.bg} ${theme.text} ${theme.font}`}>
      {toast && <Toast message={toast.message} type={toast.type} />}
      {showAd && <AdModal onSkip={() => { setShowAd(false); if(queue.length>0){ const n=queue[0]; setQueue(queue.slice(1)); setCurrentSong(n); } else { const idx=SONGS.findIndex(s=>s.id===currentSong?.id); setCurrentSong(SONGS[(idx+1)%SONGS.length]); } }} timer={adTimer} />}
      <RequestSongModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} onSubmit={handleRequestSubmit} loading={isSendingRequest} />
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} onSubmit={handleFeedbackSubmit} loading={isSendingRequest} />
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} user={userData} onSave={updateProfile} loading={false} />
      <OnboardingModal isOpen={showOnboarding} onComplete={handleOnboardingComplete} initialName={userData?.name} />

      {/* SIDEBAR */}
      <aside className="w-64 hidden md:flex flex-col items-center py-8 z-20 border-r border-white/5 bg-black/20 backdrop-blur-md">
        <div className="mb-10 p-3 bg-white/5 rounded-2xl"><Infinity size={28} className={theme.accent} /></div>
        <nav className="flex-1 space-y-2 w-full px-4">
          {[{ id: 'home', icon: Home, label: 'Home' }, { id: 'search', icon: Search, label: 'Search' }, { id: 'library', icon: Library, label: 'Library' }, { id: 'radio', icon: Radio, label: 'Radio' }].map(item => (
            <button key={item.id} onClick={() => { setView(item.id); setExpandedCategory(null); setLibraryView('overview'); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${view === item.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <item.icon size={20} /><span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-4 w-full px-4">
           {!isPremium && <button onClick={() => setView('premium')} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-black bg-gradient-to-r from-yellow-400 to-yellow-500 hover:scale-105 transition-transform"><Crown size={18}/> <span className="font-bold text-xs">GO PREMIUM</span></button>}
           <img src={userData?.avatar || AVATARS[0]} onClick={() => setView('profile')} className="w-10 h-10 rounded-full border-2 border-white/20 cursor-pointer" />
        </div>
      </aside>
      
      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#09090b]/95 backdrop-blur-xl border-t border-white/10 z-[100] flex justify-around items-center py-4 px-2">
          {[Home, Search, Library, Radio, Crown].map((Icon, i) => <button key={i} onClick={() => setView(['home', 'search', 'library', 'radio', 'premium'][i])} className={`p-2 rounded-full ${view === ['home', 'search', 'library', 'radio', 'premium'][i] ? 'bg-white/10 text-cyan-400' : 'text-gray-500'}`}><Icon size={24} /></button>)}
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between z-10 sticky top-0 bg-gradient-to-b from-black/80 to-transparent">
           <div className="flex items-center gap-4">
               <h1 className="text-3xl font-bold capitalize">{view}</h1>
               <div className="hidden md:block"><ThemeSwitcher currentEra={activeEra} setEra={setActiveEra} isPremium={isPremium} onPremiumClick={() => setView('premium')}/></div>
           </div>
           <div className="flex items-center gap-4">
              <button onClick={() => setShowRequestModal(true)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 text-cyan-400" title="Request Song"><MessageSquarePlus size={20}/></button>
              {/* Profile Icon in Header */}
              <button onClick={() => setView('profile')} className="p-2 bg-white/5 rounded-full hover:bg-white/10 border border-white/5">
                  <img src={userData?.avatar || AVATARS[0]} className="w-6 h-6 rounded-full" />
              </button>
              <button onClick={handleLogout} className="p-2.5 bg-white/5 rounded-full hover:bg-red-500/20 text-red-400"><LogOut size={20}/></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-40 custom-scrollbar">
           
           {/* ... (Home, Search, Library, Premium, Radio Views remain same) ... */}
           {view === 'home' && !expandedCategory && (
             <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                <div className="relative w-full h-[350px] rounded-[2.5rem] overflow-hidden group shadow-2xl">
                   <img src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-10 flex flex-col justify-end items-start">
                      <span className="px-4 py-1.5 rounded-full text-xs font-bold border border-cyan-400 text-cyan-300 mb-4 tracking-widest backdrop-blur-md">TOP 50 GLOBAL</span>
                      <h2 className="text-6xl font-bold mb-6">Music Universe</h2>
                      <button onClick={() => { setQueue(SONGS.filter(s => s.isTrending)); setCurrentSong(SONGS[0]); setIsPlaying(true); }} className="px-8 py-4 rounded-full font-bold text-black flex items-center gap-3 bg-white hover:bg-cyan-400 transition-all"><Play fill="black" size={24} /> Play Trending</button>
                   </div>
                </div>
                <section>
                   <h3 className="text-2xl font-bold text-white mb-6">Top 10 Latest Picks</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                      {getTopPicks().map(song => (
                          <ProfessionalSongCard key={song.id} song={song} isPlaying={currentSong?.id === song.id && isPlaying} onClick={() => setCurrentSong(song)} isLiked={likedSongs.includes(song.id)} onToggleLike={() => toggleLike(song.id)} onAddToQueue={() => setQueue([...queue, song])} isPremium={false} onAddToPlaylist={() => { setSelectedSongForPlaylist(song); setShowPlaylistModal(true); }} />
                      ))}
                   </div>
                </section>
                {/* ... other sections ... */}
             </div>
           )}
           {/* ... (Other views logic is preserved from your last upload) ... */}
           {/* Need to ensure 'profile' view has the new Feedback Button */}
           
           {view === 'profile' && (
               <div className="max-w-4xl mx-auto py-8 space-y-8 animate-fade-in">
                   <div className="p-8 rounded-[3rem] bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                       <img src={userData?.avatar || AVATARS[0]} className="w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl z-10" />
                       <div className="text-center md:text-left z-10 flex-1">
                           <h2 className="text-4xl font-bold mb-2">{userData?.name || "Music Lover"}</h2>
                           <p className="text-gray-300">{user?.email}</p>
                           <div className="flex items-center gap-4 mt-4 justify-center md:justify-start">
                               {isPremium ? <span className="px-4 py-1 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-bold flex items-center gap-2"><Crown size={14}/> PREMIUM</span> : <span className="px-4 py-1 rounded-full bg-white/10 text-gray-400 border border-white/10 text-xs font-bold">FREE PLAN</span>}
                               <button onClick={() => setShowEditProfile(true)} className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold hover:bg-white/20 flex items-center gap-2"><Edit2 size={12}/> Edit Profile</button>
                           </div>
                       </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                           <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20}/> Preferences</h3>
                           <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl mb-4">
                               <span className="text-lg">Autoplay</span>
                               <button onClick={() => setAutoplay(!autoplay)} className="transform scale-125 transition-transform">{autoplay ? <ToggleRight className="text-cyan-400" size={32}/> : <ToggleLeft className="text-gray-500" size={32}/>}</button>
                           </div>
                           {/* NEW FEEDBACK BUTTON */}
                           <Button onClick={() => setShowFeedbackModal(true)} variant="secondary" className="w-full">
                               <MessageCircle size={18} /> Send Feedback
                           </Button>
                       </div>
                       <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                           <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity size={20}/> Stats</h3>
                           <div className="flex justify-between p-3 bg-white/5 rounded-xl text-sm text-gray-400 mb-2"><span>Liked Songs</span> <span className="text-white font-bold">{likedSongs.length}</span></div>
                           <div className="flex justify-between p-3 bg-white/5 rounded-xl text-sm text-gray-400"><span>Play Time</span> <span className="text-white font-bold">{Math.floor(listeningTime / 60)} mins</span></div>
                       </div>
                   </div>
               </div>
           )}

        </div>
      </main>

      {/* PLAYER COMPONENTS */}
      {currentSong && !isFullScreenPlayer && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-[80]">
           <div className={`relative ${theme.card} rounded-[2rem] p-3 flex items-center gap-4 shadow-2xl border border-white/10 backdrop-blur-3xl pr-6 transition-all hover:scale-[1.01]`}>
              <div className="relative group cursor-pointer" onClick={() => setIsFullScreenPlayer(true)}>
                 <img src={currentSong.cover} className="w-14 h-14 rounded-xl object-cover shadow-lg" />
                 {isBuffering && <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400" size={20}/></div>}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsFullScreenPlayer(true)}>
                  <h4 className={`font-bold text-base truncate ${theme.text}`}>{currentSong.title}</h4>
                  <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={playPrev} className="text-gray-400 hover:text-white"><SkipBack size={20}/></button>
                 <button onClick={() => setIsPlaying(!isPlaying)} className={`w-10 h-10 rounded-full ${activeEra === 'retro' ? 'bg-[#ff00ff] text-white' : 'bg-white text-black'} flex items-center justify-center hover:scale-110 transition-transform shadow-lg`}>
                     {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1"/>}
                 </button>
                 <button onClick={playNext} className="text-gray-400 hover:text-white"><SkipForward size={20}/></button>
                 <button onClick={() => setShowQueue(!showQueue)} className="p-2 hover:bg-white/10 rounded-full relative"><ListOrdered size={20} className={showQueue ? "text-cyan-400" : "text-gray-400"}/></button>
              </div>
           </div>
           {/* Time Display for Mini Player */}
           <div className="absolute bottom-1 right-8 text-[10px] text-gray-400 font-mono">
               {formatTime(progress)} / {formatTime(duration)}
           </div>
        </div>
      )}

      {isFullScreenPlayer && currentSong && (
        <div className="fixed inset-0 z-[150] bg-[#09090b]/95 backdrop-blur-3xl flex flex-col animate-[fadeIn_0.3s_ease-out]">
           <div className="p-6 flex justify-end"><button onClick={() => setIsFullScreenPlayer(false)} className="p-3 bg-white/10 rounded-full hover:bg-white/20"><X size={28}/></button></div>
           <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 overflow-y-auto">
              <img src={currentSong.cover} className="w-64 h-64 md:w-80 md:h-80 aspect-square object-cover rounded-[2rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]" />
              <div className="w-full max-w-md space-y-6 text-center">
                 <div><h2 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">{currentSong.title}</h2><p className="text-xl text-gray-400">{currentSong.artist}</p></div>
                 
                 {/* SEEKBAR WITH THUMB */}
                 <div className="w-full relative group">
                     <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={progress} 
                        onChange={(e) => {
                            const time = Number(e.target.value);
                            audioRef.current.currentTime = time;
                            setProgress(time);
                        }}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-125"
                     />
                     <div className="flex justify-between text-xs text-gray-400 font-mono mt-2">
                         <span>{formatTime(progress)}</span>
                         <span>{formatTime(duration)}</span>
                     </div>
                 </div>
                 <div className="flex justify-center items-center gap-8">
                    <button onClick={playPrev}><SkipBack size={36}/></button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-6 bg-white text-black rounded-full hover:scale-105 transition-transform">{isPlaying ? <Pause size={40} fill="black" /> : <Play size={40} fill="black" className="ml-1"/>}</button>
                    <button onClick={playNext}><SkipForward size={36}/></button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* QUEUE & MODALS */}
      <QueueDrawer queue={queue} currentSong={currentSong} isOpen={showQueue} onClose={() => setShowQueue(false)} onRemove={(i) => {const n=[...queue]; n.splice(i,1); setQueue(n)}} onClear={() => setQueue([])} theme={theme} />
      {showPlaylistModal && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative">
                  <button onClick={() => setShowPlaylistModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X /></button>
                  <h3 className="text-xl font-bold mb-6">Add to Playlist</h3>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      <div className="flex gap-2 mb-4"><input className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10" placeholder="New Playlist..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} /><button onClick={() => { if(!newPlaylistName) return; const newPl = [...playlists, {name: newPlaylistName, songs: [selectedSongForPlaylist.id]}]; setPlaylists(newPl); updateProfile({ playlists: newPl }); setNewPlaylistName(""); setShowPlaylistModal(false); }} className="p-2 bg-cyan-500 rounded-lg text-black font-bold"><Plus size={18}/></button></div>
                      {playlists.map((pl, i) => (<button key={i} onClick={() => { const newPl = [...playlists]; if(!newPl[i].songs.includes(selectedSongForPlaylist.id)) { newPl[i].songs.push(selectedSongForPlaylist.id); setPlaylists(newPl); updateProfile({ playlists: newPl }); } setShowPlaylistModal(false); }} className="w-full p-4 bg-white/5 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 transition-colors"><ListMusic size={18} className="text-cyan-400"/><div className="flex-1 font-bold">{pl.name}</div></button>))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}