import { auth } from "@clerk/nextjs/server";

export default async function Page() {
    const authObject = await auth();
    return (
        <div>
            <h1>Page</h1>
            <pre>{JSON.stringify(authObject, null, 2)}</pre>
        </div>
    );
}
