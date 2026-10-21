export const productsData = [
  {
    category: "GeForce RTX 50 Series",
    content: [
      {
        name: "GeForce RTX 5090",
        art: {
          variant: "gpu",
          fans: 3,
          accent: "#76B900",
          badge: "BLACKWELL",
        },
        description:
          "The flagship of the GeForce RTX 50 series, built on the Blackwell architecture. 21,760 CUDA cores and 32 GB of GDDR7 make it the fastest consumer graphics card NVIDIA has ever shipped — and with DLSS 4 Multi Frame Generation, frame rates multiply far beyond what raw silicon alone could reach.",
      },
      {
        name: "GeForce RTX 5080",
        art: {
          variant: "gpu",
          fans: 3,
          accent: "#6aa300",
          badge: "BLACKWELL",
        },
        description:
          "A high-end Blackwell GPU with 10,752 CUDA cores and 16 GB of GDDR7 running at 30 Gbps. It targets 4K gaming with full path-tracing headroom while sipping a comparatively modest 360 watts under load.",
      },
      {
        name: "GeForce RTX 5070 Ti",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#8fd400",
          badge: "BLACKWELL",
        },
        description:
          "The value sweet spot of the upper 50 series: 8,960 CUDA cores, 16 GB of GDDR7 and a 300 W envelope. NVIDIA positions it as a card that trades blows with the previous-generation flagship for a fraction of the price.",
      },
      {
        name: "GeForce RTX 5070",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#76B900",
          badge: "BLACKWELL",
        },
        description:
          "6,144 CUDA cores and 12 GB of GDDR7 bring Blackwell's neural rendering to a mainstream price point. With DLSS 4, NVIDIA claims it can keep pace with the RTX 4090 in supported titles — a wild claim for a 250 W card.",
      },
      {
        name: "GeForce RTX 5060 Ti",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#5f9600",
          badge: "BLACKWELL",
        },
        description:
          "16 GB (or 8 GB) of GDDR7 on a 128-bit bus, 4,608 CUDA cores and a 180 W draw. Built for 1440p gaming with every RTX feature — ray tracing, DLSS and Reflex — switched on.",
      },
      {
        name: "GeForce RTX 5060",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#8fd400",
          badge: "BLACKWELL",
        },
        description:
          "The entry point to the RTX 50 generation: 3,840 CUDA cores, 8 GB of GDDR7 and a 145 W appetite. Small, efficient and fully capable of 1080p ray-traced gaming with DLSS 4 doing the heavy lifting.",
      },
    ],
  },
  {
    category: "GeForce RTX 40 Series",
    content: [
      {
        name: "GeForce RTX 4090",
        art: {
          variant: "gpu",
          fans: 3,
          accent: "#9ce600",
          badge: "ADA",
        },
        description:
          "The Ada Lovelace monster: 16,384 CUDA cores, 24 GB of GDDR6X and a 450 W appetite. Even generations later it remains one of the most powerful consumer GPUs ever made, with 3rd-gen RT cores and DLSS 3 Frame Generation.",
      },
      {
        name: "GeForce RTX 4080 SUPER",
        art: {
          variant: "gpu",
          fans: 3,
          accent: "#76B900",
          badge: "ADA",
        },
        description:
          "10,240 CUDA cores and 16 GB of GDDR6X, refreshed with a friendlier price than the original 4080. A 4K path-tracing card that stays cool at 320 W.",
      },
      {
        name: "GeForce RTX 4070 Ti SUPER",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#8fd400",
          badge: "ADA",
        },
        description:
          "8,448 CUDA cores with a rare 16 GB frame buffer on a 256-bit bus — the 40-series card that fixed the original 4070 Ti's memory limits, at 285 W.",
      },
      {
        name: "GeForce RTX 4070 SUPER",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#6aa300",
          badge: "ADA",
        },
        description:
          "A mid-cycle refresh that added 20% more cores (7,168) for the same price as the original 4070. The most recommended 1440p card of the Ada generation.",
      },
      {
        name: "GeForce RTX 4060 Ti",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#76B900",
          badge: "ADA",
        },
        description:
          "4,352 CUDA cores with an 8 GB or 16 GB GDDR6 option, sipping just 160 W. Efficient 1080p-to-1440p performance with full DLSS 3 support.",
      },
      {
        name: "GeForce RTX 4060",
        art: {
          variant: "gpu",
          fans: 2,
          accent: "#5f9600",
          badge: "ADA",
        },
        description:
          "3,072 CUDA cores and 8 GB of GDDR6 at a mere 115 W — an entry GPU that runs on a single 8-pin connector and slots into almost any prebuilt.",
      },
    ],
  },
  {
    category: "AI & Data Center",
    content: [
      {
        name: "DGX H100",
        art: { variant: "rack", accent: "#76B900", badge: "HOPPER" },
        description:
          "NVIDIA's building block of the modern AI data center: eight H100 Tensor Core GPUs and fourth-generation NVLink in one system. The DGX H100 delivers up to 32 petaFLOPS of AI training performance — the machine behind large-scale model training.",
      },
      {
        name: "GB200 NVL72",
        art: { variant: "rack", accent: "#9ce600", badge: "BLACKWELL" },
        description:
          "A liquid-cooled AI rack packing 72 Blackwell GPUs and 36 Grace CPUs into a single cabinet, linked by fifth-generation NVLink. It can serve trillion-parameter models in real time — the engine of the AI factory era.",
      },
      {
        name: "H200 Tensor Core GPU",
        art: { variant: "rack", accent: "#6aa300", badge: "HOPPER" },
        description:
          "The H200 keeps the H100's architecture but upgrades the memory to 141 GB of HBM3e at 4.8 TB/s — dramatically better for the memory-hungry workloads of large language models.",
      },
      {
        name: "Grace Hopper Superchip",
        art: { variant: "chip", accent: "#8fd400", badge: "GRACE" },
        description:
          "A 72-core Grace CPU fused to an H100 GPU over NVLink-C2C, sharing 96 GB of coherent memory. Built for the trillion-parameter AI and HPC workloads that never fit on a single GPU.",
      },
      {
        name: "Jetson Orin NX",
        art: { variant: "chip", accent: "#76B900", badge: "EDGE AI" },
        description:
          "A palm-sized AI module for robots, drones and edge machines: up to 100 TOPS of INT8 inference in a 10–25 W envelope. The brains inside countless autonomous machines.",
      },
    ],
  },
  {
    category: "The Tech Inside",
    content: [
      {
        name: "DLSS 4",
        art: { variant: "chip", accent: "#9ce600", badge: "NEURAL RENDERING" },
        description:
          "Deep Learning Super Sampling 4 is NVIDIA's biggest neural-rendering leap yet: a transformer-based model generates entire frames with Multi Frame Generation and rebuilds every ray-traced pixel with Ray Reconstruction. In supported games it multiplies frame rates several times over.",
      },
      {
        name: "Ray Tracing",
        art: { variant: "chip", accent: "#76B900", badge: "RT CORES" },
        description:
          "Third-generation RT cores physically simulate light — reflections, shadows and global illumination computed as they bounce through the scene. Since the RTX 20 series launched in 2018, GeForce has brought real-time ray tracing to millions of players.",
      },
      {
        name: "NVIDIA Reflex",
        art: { variant: "chip", accent: "#6aa300", badge: "LOW LATENCY" },
        description:
          "Reflex cuts system latency from click to photons by synchronizing the CPU and GPU render queues. In competitive shooters, lower latency means you see — and shoot — first.",
      },
      {
        name: "CUDA",
        art: { variant: "chip", accent: "#8fd400", badge: "PARALLEL COMPUTE" },
        description:
          "Launched in 2007, CUDA gave GPUs a general-purpose programming model and helped create the modern AI era. Today it runs on hundreds of millions of GPUs and underpins nearly every major AI framework.",
      },
    ],
  },
];
