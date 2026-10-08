import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, SafeAreaView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { WebView } from 'react-native-webview';

type Feed = { id: string; title: string; url: string };
type Article = { id: string; title: string; link: string; description: string; date: string; feedTitle: string };
const FEEDS_KEY = '@simple-rss-reader/feeds';
const BOOKMARKS_KEY = '@simple-rss-reader/bookmarks';
const DEFAULT_FEEDS: Feed[] = [];

const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
const field = (block: string, name: string) => decode(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '');
const parseFeed = (xml: string, feedTitle: string): Article[] => {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map((m) => m[2]);
  return blocks.map((block, index) => {
    const linkTag = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? field(block, 'link');
    const title = field(block, 'title') || '無題の記事';
    const link = linkTag.trim();
    const date = field(block, 'pubDate') || field(block, 'published') || field(block, 'updated');
    return { id: link || `${feedTitle}-${index}-${title}`, title, link, description: field(block, 'description') || field(block, 'summary'), date, feedTitle };
  }).filter((article) => article.link);
};

export default function App() {
  const [feeds, setFeeds] = useState<Feed[]>(DEFAULT_FEEDS);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [active, setActive] = useState<'articles' | 'feeds' | 'bookmarks'>('articles');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [webArticle, setWebArticle] = useState<Article | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [feedName, setFeedName] = useState('');

  useEffect(() => { (async () => { const savedFeeds = await AsyncStorage.getItem(FEEDS_KEY); const savedBookmarks = await AsyncStorage.getItem(BOOKMARKS_KEY); if (savedFeeds) setFeeds(JSON.parse(savedFeeds)); if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks)); })(); }, []);
  const saveBookmarks = async (next: Article[]) => { setBookmarks(next); await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next)); };
  const refresh = async () => {
    if (!feeds.length) { setArticles([]); return; }
    setLoading(true);
    try { const results = (await Promise.all(feeds.map(async (feed) => { const response = await fetch(feed.url); if (!response.ok) throw new Error(`${response.status}`); return parseFeed(await response.text(), feed.title); }))).flat(); setArticles(results.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))); }
    catch { Alert.alert('読み込みエラー', 'RSSを取得できませんでした。URLやネットワークを確認してください。'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [feeds]);
  const addFeed = async () => { const value = url.trim(); if (!/^https?:\/\//i.test(value)) { Alert.alert('URLを確認してください', 'http:// または https:// から始まるURLを入力してください。'); return; } const next = [...feeds, { id: `${Date.now()}`, title: feedName.trim() || value, url: value }]; setFeeds(next); await AsyncStorage.setItem(FEEDS_KEY, JSON.stringify(next)); setUrl(''); setFeedName(''); setModal(false); };
  const removeFeed = async (id: string) => { const next = feeds.filter((feed) => feed.id !== id); setFeeds(next); await AsyncStorage.setItem(FEEDS_KEY, JSON.stringify(next)); };
  const visible = active === 'bookmarks' ? bookmarks : articles;
  const empty = active === 'feeds' ? '登録したRSSフィードはありません。' : active === 'bookmarks' ? '保存した記事はありません。' : feeds.length ? '記事がありません。' : 'まずRSSフィードを登録してください。';
  const feedList = useMemo(() => feeds, [feeds]);
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.header}><View><Text style={styles.eyebrow}>LOCAL READER</Text><Text style={styles.heading}>{active === 'feeds' ? 'フィード' : active === 'bookmarks' ? 'ブックマーク' : 'タイムライン'}</Text></View><Pressable style={styles.addButton} onPress={() => setModal(true)}><Text style={styles.addText}>＋ RSS</Text></Pressable></View>
    {active === 'feeds' ? <FlatList data={feedList} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>} renderItem={({ item }) => <View style={styles.feedRow}><View style={styles.feedIcon}><Text style={styles.feedIconText}>RSS</Text></View><View style={styles.feedInfo}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.url} numberOfLines={1}>{item.url}</Text></View><Pressable onPress={() => removeFeed(item.id)}><Text style={styles.delete}>削除</Text></Pressable></View>} /> : <FlatList data={visible} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshing={loading} onRefresh={refresh} ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>} renderItem={({ item }) => <Pressable style={styles.card} onPress={() => item.link && setWebArticle(item)}><View style={styles.cardMeta}><Text style={styles.source}>{item.feedTitle}</Text><Pressable onPress={() => saveBookmarks(bookmarks.some((b) => b.id === item.id) ? bookmarks.filter((b) => b.id !== item.id) : [...bookmarks, item])}><Text style={styles.star}>{bookmarks.some((b) => b.id === item.id) ? '★' : '☆'}</Text></Pressable></View><Text style={styles.cardTitle}>{item.title}</Text>{!!item.description && <Text style={styles.description} numberOfLines={3}>{item.description}</Text>}<Text style={styles.date}>{item.date ? new Date(item.date).toLocaleDateString('ja-JP') : ''}</Text></Pressable>} />}
    <View style={styles.tabs}>{[['articles', '記事'], ['feeds', 'フィード'], ['bookmarks', '保存']].map(([key, label]) => <Pressable key={key} style={styles.tab} onPress={() => setActive(key as typeof active)}><Text style={[styles.tabText, active === key && styles.tabActive]}>{label}</Text></Pressable>)}</View>
    <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}><View style={styles.modal}><Text style={styles.modalTitle}>RSSフィードを追加</Text><TextInput style={styles.input} placeholder="フィード名（任意）" placeholderTextColor="#8b93a7" value={feedName} onChangeText={setFeedName} /><TextInput style={styles.input} placeholder="https://example.com/feed.xml" placeholderTextColor="#8b93a7" autoCapitalize="none" keyboardType="url" value={url} onChangeText={setUrl} /><View style={styles.modalActions}><Pressable onPress={() => setModal(false)}><Text style={styles.cancel}>キャンセル</Text></Pressable><Pressable style={styles.save} onPress={addFeed}><Text style={styles.saveText}>保存する</Text></Pressable></View></View></KeyboardAvoidingView></Modal>
    <Modal visible={!!webArticle} animationType="slide" onRequestClose={() => setWebArticle(null)}>
      <SafeAreaView style={styles.webSafe}>
        <StatusBar style="light" />
        <View style={styles.webHeader}>
          <Pressable style={styles.webBack} onPress={() => setWebArticle(null)}><Text style={styles.webBackText}>‹ 戻る</Text></Pressable>
          <Text style={styles.webTitle} numberOfLines={1}>{webArticle?.title}</Text>
          <View style={styles.webBack} />
        </View>
        {webLoading && <View style={styles.webLoading}><ActivityIndicator color="#8f82ff" /></View>}
        {webArticle && <WebView source={{ uri: webArticle.link }} style={styles.webView} onLoadStart={() => setWebLoading(true)} onLoadEnd={() => setWebLoading(false)} />}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0b1020' }, header: { padding: 24, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: '#7480a0', fontSize: 11, letterSpacing: 2 }, heading: { color: '#f8fafc', fontSize: 30, fontWeight: '800', marginTop: 5 }, addButton: { backgroundColor: '#6d5dfc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }, addText: { color: '#fff', fontWeight: '700' }, list: { padding: 16, paddingTop: 4, paddingBottom: 100, flexGrow: 1 }, card: { backgroundColor: '#151d31', borderRadius: 16, padding: 18, marginBottom: 12 }, cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, source: { color: '#8f82ff', fontSize: 12, fontWeight: '700' }, star: { color: '#f8c84e', fontSize: 25 }, cardTitle: { color: '#f8fafc', fontSize: 17, lineHeight: 24, fontWeight: '700', marginTop: 7 }, description: { color: '#aeb7ca', lineHeight: 20, marginTop: 8 }, date: { color: '#6f7892', fontSize: 12, marginTop: 12 }, empty: { color: '#8d98b1', textAlign: 'center', marginTop: 100, lineHeight: 24 }, tabs: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, backgroundColor: '#11182b', borderTopWidth: 1, borderTopColor: '#202b43', flexDirection: 'row' }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, tabText: { color: '#6f7892', fontWeight: '700' }, tabActive: { color: '#a69cff' }, feedRow: { backgroundColor: '#151d31', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }, feedIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#29245e', justifyContent: 'center', alignItems: 'center' }, feedIconText: { color: '#a69cff', fontSize: 11, fontWeight: '800' }, feedInfo: { flex: 1, marginHorizontal: 12 }, url: { color: '#7e89a5', marginTop: 4, fontSize: 12 }, delete: { color: '#ff7f8a', fontSize: 12 }, modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }, modal: { backgroundColor: '#151d31', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }, modalTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginBottom: 18 }, input: { backgroundColor: '#0b1020', color: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 12 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, marginTop: 8 }, cancel: { color: '#aeb7ca', fontWeight: '700' }, save: { backgroundColor: '#6d5dfc', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 }, saveText: { color: '#fff', fontWeight: '800' }, webSafe: { flex: 1, backgroundColor: '#0b1020' }, webHeader: { height: 54, backgroundColor: '#11182b', borderBottomWidth: 1, borderBottomColor: '#202b43', flexDirection: 'row', alignItems: 'center' }, webBack: { width: 76, paddingHorizontal: 12, paddingVertical: 14 }, webBackText: { color: '#a69cff', fontSize: 16, fontWeight: '700' }, webTitle: { flex: 1, color: '#f8fafc', textAlign: 'center', fontWeight: '700' }, webLoading: { position: 'absolute', top: 54, left: 0, right: 0, zIndex: 2, paddingVertical: 8, backgroundColor: '#11182be6' }, webView: { flex: 1, backgroundColor: '#fff' } });
