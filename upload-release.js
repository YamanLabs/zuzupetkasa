const fs = require('fs');
const path = require('path');

const token = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = process.env.RELEASE_VERSION || pkg.version;
const repo = "YamanLabs/zuzupetkasa";
const tag = `v${version}`;
const releaseDir = path.join(__dirname, 'dist', `release-v${version}`);

if (!fs.existsSync(releaseDir)) {
    console.error("Release directory not found:", releaseDir);
    process.exit(1);
}

const files = fs.readdirSync(releaseDir).filter(f => f.endsWith('.asar') || f.endsWith('.exe'));

if (files.length === 0) {
    console.error("No files found to upload in", releaseDir);
    process.exit(1);
}

async function upload() {
    console.log(`Creating release ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tag_name: tag,
            name: `ZUZU PET KASA - Yazılım Güncellemesi (${tag})`,
            body: `- Versiyon karşılaştırma mantığı iyileştirildi.\n- Eski istemciler için (.exe) güncelleme altyapısı düzeltildi.\n- Otomatik güncelleme stabilite iyileştirmeleri.`,
            draft: false,
            prerelease: false
        })
    });

    let releaseData;
    if (!createRes.ok) {
        const err = await createRes.text();
        if (createRes.status === 422 && err.includes('already_exists')) {
            console.log("Release already exists, fetching it...");
            const getRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                }
            });
            releaseData = await getRes.json();
        } else {
            console.error("Failed to create release:", err);
            process.exit(1);
        }
    } else {
        releaseData = await createRes.json();
    }

    console.log(`Release ready with ID: ${releaseData.id}`);

    const uploadUrlBase = releaseData.upload_url.split('{')[0];

    for (const file of files) {
        console.log(`Uploading ${file}...`);
        const filePath = path.join(releaseDir, file);
        const stats = fs.statSync(filePath);
        
        const fileData = fs.readFileSync(filePath);
        
        const uploadUrl = `${uploadUrlBase}?name=${encodeURIComponent(file)}`;
        
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/octet-stream',
                'Content-Length': stats.size
            },
            body: fileData
        });
        
        if (!uploadRes.ok) {
            console.error(`Failed to upload ${file}:`, await uploadRes.text());
        } else {
            console.log(`Successfully uploaded ${file}.`);
        }
    }
    console.log("All done! Release v1.6.1 is live on GitHub.");
}

upload().catch(console.error);
