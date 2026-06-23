# 上限仕入れ額計算機

ブラウザやローカルサーバーを使わずに起動できるElectron版を作成済みです。

## 起動するファイル

```text
desktop-dist/上限仕入れ額計算機.exe
```

このexe単体で起動できます。`127.0.0.1:5174` は使いません。

起動を軽くしたい場合は、単体exeではなく以下の展開版を使うと初回展開がないため速く起動します。

```text
desktop-dist/win-unpacked/上限仕入れ額計算機.exe
```

ただし、この場合は `desktop-dist/win-unpacked` フォルダ全体を同じ場所に置いて使います。

## 操作

- `最前面` ボタンでウィンドウを前面固定できます。
- `クリア` ボタンで想定売値を消せます。
- `Esc` キーでも想定売値を消せます。想定売値が空のときは電卓をクリアします。
- 電卓の表示数字は仕入れ時に見やすいよう大きく強調しています。

## スマホ向けPWA公開

このプロジェクトはNetlifyでPWAとして公開できます。公開後、スマホのホーム画面に追加するとアプリのように起動できます。

1. GitHubで空のリポジトリを作成する。リポジトリ名は `dentaku` を推奨。
2. このフォルダでGitHubリポジトリを登録してpushする。

```powershell
git remote add origin https://github.com/<GitHubユーザー名>/dentaku.git
git add .
git commit -m "Initial PWA release"
git push -u origin main
```

3. Netlifyで **Add new site** から **Import an existing project** を選び、GitHubリポジトリを選択する。
4. Netlifyが `netlify.toml` を読むため、ビルドコマンドと公開フォルダは自動設定される。
   - Build command: `npm run build`
   - Publish directory: `web-dist`
5. デプロイ後のURLをスマホで開く。
   - iPhone: Safariの共有メニューから **ホーム画面に追加**
   - Android: Chromeのメニューから **アプリをインストール** または **ホーム画面に追加**

設定・履歴はブラウザごとのローカル保存です。PCとスマホで同期が必要になった場合は、別途クラウド保存を追加します。

## 再ビルド

```powershell
npm run desktop
```

## 確認コマンド

```powershell
npm run build
npx electron . --self-test
npm audit --audit-level=high
```
