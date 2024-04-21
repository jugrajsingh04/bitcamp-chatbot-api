export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to the correct domain
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS'); // Optionally add POST, PUT, DELETE, etc.
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(200).json({ message: 'asst_Ttw0tknAKTL1oR5bJpxOrEfF' });
}