import asyncio
import os
import sys

sys.path.append(r"d:\createxAntigravity\backend")
from reflection import generate_insights

async def main():
    history = [
        {"emotion": "happy", "created_at": "2023-10-27 10:00:00", "note": "Woke up feeling great"},
    ]
    counts = [{"emotion": "happy", "count": 1}]
    
    result = await generate_insights(history, counts)
    print("Result:", result)

if __name__ == "__main__":
    asyncio.run(main())
